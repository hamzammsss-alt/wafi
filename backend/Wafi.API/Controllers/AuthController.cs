using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Wafi.API.Extensions;
using Wafi.API.Security;
using Wafi.Core.Entities;
using Wafi.Core.Interfaces;
using Wafi.Core.Security;
using Wafi.Infrastructure.Data;

namespace Wafi.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IPermissionResolver _permissionResolver;

        public AuthController(
            ApplicationDbContext context,
            ITokenService tokenService,
            IPasswordHasher<User> passwordHasher,
            IPermissionResolver permissionResolver)
        {
            _context = context;
            _tokenService = tokenService;
            _passwordHasher = passwordHasher;
            _permissionResolver = permissionResolver;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto login)
        {
            var identifier = login.Username.Trim();
            var password = login.Password;

            var user = await _context.Users
                .Include(u => u.Tenant)
                .FirstOrDefaultAsync(u =>
                    EF.Functions.ILike(u.Username, identifier) ||
                    EF.Functions.ILike(u.Email, identifier));

            if (user == null)
            {
                return Unauthorized("Invalid credentials");
            }

            if (!user.IsActive)
            {
                return Unauthorized("User account is inactive");
            }

            if (user.Tenant is not null && !user.Tenant.IsActive)
            {
                return Unauthorized("Tenant is inactive");
            }

            if (user.Tenant is not null &&
                user.Tenant.SubscriptionExpiresAt != default &&
                user.Tenant.SubscriptionExpiresAt < DateTime.UtcNow)
            {
                return Unauthorized("Tenant subscription has expired");
            }

            if (!VerifyPassword(user, password, out var shouldRehash))
            {
                return Unauthorized("Invalid credentials");
            }

            if (shouldRehash)
            {
                user.PasswordHash = _passwordHasher.HashPassword(user, password);
            }

            user.LastLogin = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = _tokenService.CreateToken(user);
            var permissions = await _permissionResolver.GetEffectivePermissionsAsync(user.TenantId, user.Role);

            return Ok(new 
            { 
                Token = token, 
                User = new
                {
                    user.Id,
                    user.Username,
                    user.Email,
                    user.FullName,
                    user.Role,
                    user.TenantId,
                    TenantName = user.Tenant?.Name,
                    Permissions = permissions
                }
            });
        }

        [HttpGet("me")]
        [HasPermission(AppPermissions.Auth.Me)]
        public async Task<IActionResult> Me()
        {
            var userId = User.GetUserId();
            var tenantId = User.GetTenantId();

            if (userId is null || tenantId is null)
            {
                return Forbid();
            }

            var user = await _context.Users
                .Include(x => x.Tenant)
                .FirstOrDefaultAsync(x => x.Id == userId.Value && x.TenantId == tenantId.Value);

            if (user == null)
            {
                return NotFound();
            }

            var permissions = await _permissionResolver.GetEffectivePermissionsAsync(user.TenantId, user.Role);

            return Ok(new
            {
                user.Id,
                user.Username,
                user.Email,
                user.FullName,
                user.Role,
                user.TenantId,
                TenantName = user.Tenant?.Name,
                Permissions = permissions,
                user.LastLogin,
                user.IsActive
            });
        }

        private bool VerifyPassword(User user, string password, out bool shouldRehash)
        {
            shouldRehash = false;

            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                return false;
            }

            var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
            if (verification == PasswordVerificationResult.Success)
            {
                return true;
            }

            if (verification == PasswordVerificationResult.SuccessRehashNeeded)
            {
                shouldRehash = true;
                return true;
            }

            if (string.Equals(user.PasswordHash, password, StringComparison.Ordinal))
            {
                shouldRehash = true;
                return true;
            }

            return false;
        }
    }

    public class LoginDto 
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}
