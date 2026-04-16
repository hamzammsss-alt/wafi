using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Wafi.API.Extensions;
using Wafi.API.Security;
using Wafi.Core.DTOs;
using Wafi.Core.Entities;
using Wafi.Core.Security;
using Wafi.Infrastructure.Data;
using System.Text.Json;

namespace Wafi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SyncController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SyncController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("push")]
        [HasPermission(AppPermissions.Sync.Push)]
        public async Task<IActionResult> PushChanges([FromBody] PushChangesRequest request)
        {
            var tenantId = User.GetTenantId();
            if (tenantId is null)
            {
                return Forbid();
            }

            if (request.DeviceId == Guid.Empty)
            {
                return BadRequest(new { error = "DeviceId is required" });
            }

            if (request.Changes == null || request.Changes.Count == 0)
            {
                return BadRequest(new { error = "At least one change is required" });
            }

            // Transactional Save
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var change in request.Changes)
                {
                    var normalizedOperation = NormalizeOperation(change.Operation);
                    if (normalizedOperation == null)
                    {
                        return BadRequest(new { error = $"Unsupported sync operation: {change.Operation}" });
                    }

                    if (string.IsNullOrWhiteSpace(change.EntityType))
                    {
                        return BadRequest(new { error = "EntityType is required for each change" });
                    }

                    // 1. Log the change in server's SyncLog so other clients can pull it
                    // In a real implementation, we would apply the change to the specific table (e.g. InvItem)
                    // and let a Trigger/Interceptor create the SyncLog. 
                    // For this prototype, we are just mocking the "Application" of data.
                    
                    var syncEntry = new SyncLog
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId.Value,
                        EntityId = change.Id,
                        EntityType = change.EntityType.Trim(),
                        Operation = normalizedOperation,
                        JsonData = change.Data.ValueKind == JsonValueKind.Undefined ? "{}" : change.Data.GetRawText(),
                        DeviceId = request.DeviceId,
                        Timestamp = change.Timestamp == default
                            ? DateTime.UtcNow
                            : change.Timestamp.ToUniversalTime()
                    };
                    
                    _context.SyncLogs.Add(syncEntry);
                    
                    // TODO: Reflection or Switch Statement to Apply chagne to actual DB Table
                    // ApplyChangeToTable(change); 
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    success = true,
                    processed = request.Changes.Count,
                    tenantId = tenantId.Value,
                    pushedBy = User.GetUsername()
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("pull")]
        [HasPermission(AppPermissions.Sync.Pull)]
        public async Task<IActionResult> PullUpdates([FromBody] PullUpdatesRequest request)
        {
            var tenantId = User.GetTenantId();
            if (tenantId is null)
            {
                return Forbid();
            }

            if (request.TenantId != Guid.Empty && request.TenantId != tenantId.Value)
            {
                return Forbid();
            }

            var lastSyncUtc = request.LastSyncTimestamp == default
                ? DateTime.MinValue
                : request.LastSyncTimestamp.ToUniversalTime();

            // Get all changes that happened AFTER the client's last sync
            var changes = await _context.SyncLogs
                .Where(x => x.TenantId == tenantId.Value && x.Timestamp > lastSyncUtc)
                .OrderBy(x => x.Timestamp)
                .ToListAsync();

            var response = new PullUpdatesResponse
            {
                NewSyncTimestamp = DateTime.UtcNow,
                Updates = changes.Select(x => new EntityChangeDto
                {
                    Id = x.EntityId,
                    EntityType = x.EntityType,
                    Operation = x.Operation,
                    Data = JsonSerializer.Deserialize<JsonElement>(x.JsonData), // Simplified
                    Timestamp = x.Timestamp
                }).ToList()
            };

            return Ok(response);
        }

        private static string? NormalizeOperation(string? operation)
        {
            var normalized = operation?.Trim().ToUpperInvariant();
            return normalized switch
            {
                "INSERT" => "INSERT",
                "UPDATE" => "UPDATE",
                "DELETE" => "DELETE",
                _ => null
            };
        }
    }
}
