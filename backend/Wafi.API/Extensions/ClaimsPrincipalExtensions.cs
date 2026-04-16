using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Wafi.API.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static Guid? GetTenantId(this ClaimsPrincipal user)
        {
            var rawTenantId =
                user.FindFirstValue("tenantId") ??
                user.FindFirstValue("tenant_id");

            return Guid.TryParse(rawTenantId, out var tenantId) ? tenantId : null;
        }

        public static Guid? GetUserId(this ClaimsPrincipal user)
        {
            var rawUserId =
                user.FindFirstValue(ClaimTypes.NameIdentifier) ??
                user.FindFirstValue(JwtRegisteredClaimNames.Sub);

            return Guid.TryParse(rawUserId, out var userId) ? userId : null;
        }

        public static string? GetUsername(this ClaimsPrincipal user)
        {
            return user.FindFirstValue(ClaimTypes.Name) ??
                   user.FindFirstValue(JwtRegisteredClaimNames.UniqueName) ??
                   user.FindFirstValue(JwtRegisteredClaimNames.NameId);
        }

        public static string? GetRoleName(this ClaimsPrincipal user)
        {
            return user.FindFirstValue(ClaimTypes.Role) ??
                   user.FindFirstValue("role");
        }

        public static bool HasRole(this ClaimsPrincipal user, params string[] roles)
        {
            if (roles == null || roles.Length == 0) return false;

            var roleName = user.GetRoleName();
            return roles.Any(role =>
                user.IsInRole(role) ||
                string.Equals(roleName, role, StringComparison.OrdinalIgnoreCase));
        }
    }
}
