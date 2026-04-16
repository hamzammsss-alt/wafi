using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Wafi.API.Extensions;
using Wafi.API.Security;
using Wafi.Core.Entities;
using Wafi.Core.Security;
using Wafi.Infrastructure.Data;

namespace Wafi.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TenantsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TenantsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [HasPermission(AppPermissions.Tenants.Read)]
        public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants()
        {
            if (User.HasRole("SuperAdmin"))
            {
                return await _context.Tenants
                    .OrderBy(t => t.Name)
                    .ToListAsync();
            }

            var tenantId = User.GetTenantId();
            if (tenantId is null)
            {
                return Forbid();
            }

            return await _context.Tenants
                .Where(t => t.Id == tenantId.Value)
                .OrderBy(t => t.Name)
                .ToListAsync();
        }

        [HttpGet("{id:guid}")]
        [HasPermission(AppPermissions.Tenants.Read)]
        public async Task<ActionResult<Tenant>> GetTenant(Guid id)
        {
            var currentTenantId = User.GetTenantId();
            var isSuperAdmin = User.HasRole("SuperAdmin");

            if (!isSuperAdmin && currentTenantId != id)
            {
                return Forbid();
            }

            var tenant = await _context.Tenants.FindAsync(id);

            if (tenant == null)
            {
                return NotFound();
            }

            return tenant;
        }

        [HttpPost]
        [HasPermission(AppPermissions.Tenants.Create)]
        public async Task<ActionResult<Tenant>> CreateTenant([FromBody] CreateTenantDto request)
        {
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                TaxNumber = request.TaxNumber.Trim(),
                Email = request.Email.Trim(),
                Phone = request.Phone.Trim(),
                PlanType = string.IsNullOrWhiteSpace(request.PlanType) ? "Free" : request.PlanType.Trim(),
                SubscriptionExpiresAt = request.SubscriptionExpiresAt ?? DateTime.UtcNow.AddYears(1),
                IsActive = request.IsActive
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetTenant", new { id = tenant.Id }, tenant);
        }
    }

    public class CreateTenantDto
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string TaxNumber { get; set; } = string.Empty;

        [EmailAddress]
        [MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(50)]
        public string PlanType { get; set; } = "Free";

        public DateTime? SubscriptionExpiresAt { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
