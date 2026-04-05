using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Wafi.Core.DTOs;
using Wafi.Core.Entities;
using Wafi.Infrastructure.Data;
using System.Text.Json;

namespace Wafi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SyncController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SyncController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("push")]
        public async Task<IActionResult> PushChanges([FromBody] PushChangesRequest request)
        {
            // Transactional Save
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var change in request.Changes)
                {
                    // 1. Log the change in server's SyncLog so other clients can pull it
                    // In a real implementation, we would apply the change to the specific table (e.g. InvItem)
                    // and let a Trigger/Interceptor create the SyncLog. 
                    // For this prototype, we are just mocking the "Application" of data.
                    
                    var syncEntry = new SyncLog
                    {
                        Id = Guid.NewGuid(),
                        TenantId = Guid.Empty, // Should get from Auth
                        EntityId = change.Id,
                        EntityType = change.EntityType,
                        Operation = change.Operation,
                        JsonData = change.Data.GetRawText(),
                        DeviceId = request.DeviceId,
                        Timestamp = DateTime.UtcNow
                    };
                    
                    _context.SyncLogs.Add(syncEntry);
                    
                    // TODO: Reflection or Switch Statement to Apply chagne to actual DB Table
                    // ApplyChangeToTable(change); 
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { success = true, processed = request.Changes.Count });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("pull")]
        public async Task<IActionResult> PullUpdates([FromBody] PullUpdatesRequest request)
        {
            // Get all changes that happened AFTER the client's last sync
            var changes = await _context.SyncLogs
                .Where(x => x.Timestamp > request.LastSyncTimestamp)
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
    }
}
