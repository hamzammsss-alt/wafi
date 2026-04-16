using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Wafi.API.Extensions;
using Wafi.API.Security;
using Wafi.Core.DTOs;
using Wafi.Core.Entities;
using Wafi.Core.Security;
using Wafi.Infrastructure.Data;

namespace Wafi.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RolesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RolesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("available-permissions")]
        [HasPermission(AppPermissions.Roles.Read)]
        public ActionResult<IEnumerable<PermissionDescriptorDto>> GetAvailablePermissions()
        {
            var items = PermissionCatalog.GetAll()
                .Select(permission =>
                {
                    var parts = permission.Split('.', 2, StringSplitOptions.RemoveEmptyEntries);
                    return new PermissionDescriptorDto
                    {
                        Key = permission,
                        Group = parts.FirstOrDefault() ?? "general",
                        Name = parts.Length > 1 ? parts[1] : permission
                    };
                })
                .OrderBy(item => item.Group)
                .ThenBy(item => item.Name)
                .ToList();

            return Ok(new
            {
                total = items.Count,
                items
            });
        }

        [HttpGet]
        [HasPermission(AppPermissions.Roles.Read)]
        public async Task<ActionResult<IEnumerable<RoleDto>>> GetRoles([FromQuery] Guid? tenantId = null)
        {
            if (!TryResolveTenantScope(tenantId, out var scopedTenantId, out var errorResult))
            {
                return errorResult!;
            }

            var roles = await _context.Roles
                .AsNoTracking()
                .Where(r => r.TenantId == scopedTenantId)
                .OrderBy(r => r.Name)
                .ToListAsync();

            return Ok(roles.Select(MapRole).ToList());
        }

        [HttpGet("{id:guid}")]
        [HasPermission(AppPermissions.Roles.Read)]
        public async Task<ActionResult<RoleDto>> GetRole(Guid id)
        {
            var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
            if (role == null)
            {
                return NotFound();
            }

            if (!TryResolveTenantScope(role.TenantId, out _, out var errorResult))
            {
                return errorResult!;
            }

            return Ok(MapRole(role));
        }

        [HttpPost]
        [HasPermission(AppPermissions.Roles.Manage)]
        public async Task<ActionResult<RoleDto>> CreateRole([FromBody] UpsertRoleDto request)
        {
            if (!TryResolveTenantScope(request.TenantId, out var scopedTenantId, out var errorResult))
            {
                return errorResult!;
            }

            var normalizedName = request.Name.Trim();
            if (string.IsNullOrWhiteSpace(normalizedName))
            {
                return BadRequest(new { error = "Role name is required" });
            }

            var normalizedPermissions = NormalizePermissions(request.Permissions);
            var invalidPermissions = GetInvalidPermissions(normalizedPermissions);
            if (invalidPermissions.Count > 0)
            {
                return BadRequest(new { error = "Invalid permissions detected", invalidPermissions });
            }

            var duplicateExists = await _context.Roles.AnyAsync(r =>
                r.TenantId == scopedTenantId &&
                r.Name.ToLower() == normalizedName.ToLower());

            if (duplicateExists)
            {
                return Conflict(new { error = $"Role already exists: {normalizedName}" });
            }

            var role = new Role
            {
                Id = Guid.NewGuid(),
                TenantId = scopedTenantId,
                Name = normalizedName,
                Description = request.Description?.Trim() ?? string.Empty,
                Permissions = normalizedPermissions,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, MapRole(role));
        }

        [HttpPut("{id:guid}")]
        [HasPermission(AppPermissions.Roles.Manage)]
        public async Task<ActionResult<RoleDto>> UpdateRole(Guid id, [FromBody] UpsertRoleDto request)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id);
            if (role == null)
            {
                return NotFound();
            }

            if (!TryResolveTenantScope(role.TenantId, out var scopedTenantId, out var errorResult))
            {
                return errorResult!;
            }

            var normalizedName = request.Name.Trim();
            if (string.IsNullOrWhiteSpace(normalizedName))
            {
                return BadRequest(new { error = "Role name is required" });
            }

            var normalizedPermissions = NormalizePermissions(request.Permissions);
            var invalidPermissions = GetInvalidPermissions(normalizedPermissions);
            if (invalidPermissions.Count > 0)
            {
                return BadRequest(new { error = "Invalid permissions detected", invalidPermissions });
            }

            var duplicateExists = await _context.Roles.AnyAsync(r =>
                r.Id != id &&
                r.TenantId == scopedTenantId &&
                r.Name.ToLower() == normalizedName.ToLower());

            if (duplicateExists)
            {
                return Conflict(new { error = $"Role already exists: {normalizedName}" });
            }

            role.Name = normalizedName;
            role.Description = request.Description?.Trim() ?? string.Empty;
            role.Permissions = normalizedPermissions;
            role.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(MapRole(role));
        }

        [HttpPut("{id:guid}/permissions")]
        [HasPermission(AppPermissions.Roles.Manage)]
        public async Task<ActionResult<RoleDto>> UpdateRolePermissions(Guid id, [FromBody] UpdateRolePermissionsDto request)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id);
            if (role == null)
            {
                return NotFound();
            }

            if (!TryResolveTenantScope(role.TenantId, out _, out var errorResult))
            {
                return errorResult!;
            }

            var normalizedPermissions = NormalizePermissions(request.Permissions);
            var invalidPermissions = GetInvalidPermissions(normalizedPermissions);
            if (invalidPermissions.Count > 0)
            {
                return BadRequest(new { error = "Invalid permissions detected", invalidPermissions });
            }

            role.Permissions = normalizedPermissions;
            role.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(MapRole(role));
        }

        [HttpPost("seed-defaults")]
        [HasPermission(AppPermissions.Roles.Manage)]
        public async Task<IActionResult> SeedDefaultRoles([FromQuery] Guid? tenantId = null)
        {
            if (!TryResolveTenantScope(tenantId, out var scopedTenantId, out var errorResult))
            {
                return errorResult!;
            }

            var tenantExists = await _context.Tenants.AnyAsync(t => t.Id == scopedTenantId);
            if (!tenantExists)
            {
                return NotFound(new { error = "Tenant not found" });
            }

            var defaults = DefaultRolePermissionSets.GetAll();
            var existingRoles = await _context.Roles
                .Where(r => r.TenantId == scopedTenantId)
                .ToListAsync();

            var inserted = 0;
            var updated = 0;

            foreach (var definition in defaults)
            {
                var role = existingRoles.FirstOrDefault(r =>
                    string.Equals(r.Name, definition.Name, StringComparison.OrdinalIgnoreCase));

                var permissions = NormalizePermissions(definition.Permissions);

                if (role == null)
                {
                    _context.Roles.Add(new Role
                    {
                        Id = Guid.NewGuid(),
                        TenantId = scopedTenantId,
                        Name = definition.Name,
                        Description = definition.Description,
                        Permissions = permissions,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    inserted++;
                    continue;
                }

                role.Description = definition.Description;
                role.Permissions = permissions;
                role.UpdatedAt = DateTime.UtcNow;
                updated++;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                tenantId = scopedTenantId,
                inserted,
                updated,
                totalDefaults = defaults.Count
            });
        }

        [HttpDelete("{id:guid}")]
        [HasPermission(AppPermissions.Roles.Manage)]
        public async Task<IActionResult> DeleteRole(Guid id)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id);
            if (role == null)
            {
                return NotFound();
            }

            if (!TryResolveTenantScope(role.TenantId, out _, out var errorResult))
            {
                return errorResult!;
            }

            role.IsDeleted = true;
            role.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, roleId = role.Id });
        }

        private bool TryResolveTenantScope(Guid? requestedTenantId, out Guid tenantId, out IActionResult? errorResult)
        {
            tenantId = Guid.Empty;
            errorResult = null;

            var currentTenantId = User.GetTenantId();
            var isSuperAdmin = User.HasRole("SuperAdmin");

            if (isSuperAdmin)
            {
                tenantId = requestedTenantId ?? currentTenantId ?? Guid.Empty;
                if (tenantId == Guid.Empty)
                {
                    errorResult = BadRequest(new { error = "TenantId is required for this request" });
                    return false;
                }

                return true;
            }

            if (currentTenantId is null)
            {
                errorResult = Forbid();
                return false;
            }

            if (requestedTenantId.HasValue && requestedTenantId.Value != currentTenantId.Value)
            {
                errorResult = Forbid();
                return false;
            }

            tenantId = currentTenantId.Value;
            return true;
        }

        private static List<string> NormalizePermissions(IEnumerable<string>? permissions)
        {
            return (permissions ?? Array.Empty<string>())
                .Where(permission => !string.IsNullOrWhiteSpace(permission))
                .Select(permission => permission.Trim().ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(permission => permission, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static List<string> GetInvalidPermissions(IEnumerable<string> permissions)
        {
            var knownPermissions = PermissionCatalog.GetAll()
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            return permissions
                .Where(permission => !knownPermissions.Contains(permission))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(permission => permission, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static RoleDto MapRole(Role role)
        {
            return new RoleDto
            {
                Id = role.Id,
                TenantId = role.TenantId,
                Name = role.Name,
                Description = role.Description,
                Permissions = NormalizePermissions(role.Permissions),
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt
            };
        }
    }
}
