using Microsoft.EntityFrameworkCore;
using Wafi.Core.Security;
using Wafi.Infrastructure.Data;

namespace Wafi.API.Security
{
    public sealed class PermissionResolver : IPermissionResolver
    {
        private readonly ApplicationDbContext _context;

        public PermissionResolver(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyCollection<string>> GetEffectivePermissionsAsync(
            Guid tenantId,
            string? roleName,
            CancellationToken cancellationToken = default)
        {
            if (tenantId == Guid.Empty || string.IsNullOrWhiteSpace(roleName))
            {
                return Array.Empty<string>();
            }

            var normalizedRoleName = roleName.Trim();

            var role = await _context.Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.TenantId == tenantId &&
                    r.Name.ToLower() == normalizedRoleName.ToLower(),
                    cancellationToken);

            if (role?.Permissions is { Count: > 0 })
            {
                return role.Permissions
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .Select(NormalizePermission)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
            }

            if (string.Equals(normalizedRoleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                return new[] { "*" };
            }

            return DefaultRolePermissionSets.GetPermissionsForRole(normalizedRoleName);
        }

        public bool HasPermission(IReadOnlyCollection<string> permissions, string requiredPermission)
        {
            var normalizedRequired = NormalizePermission(requiredPermission);
            if (string.IsNullOrWhiteSpace(normalizedRequired) || permissions.Count == 0)
            {
                return false;
            }

            foreach (var permission in permissions)
            {
                var normalizedPermission = NormalizePermission(permission);

                if (normalizedPermission == "*" || normalizedPermission == normalizedRequired)
                {
                    return true;
                }

                if (normalizedPermission.EndsWith(".*", StringComparison.Ordinal))
                {
                    var prefix = normalizedPermission[..^1];
                    if (normalizedRequired.StartsWith(prefix, StringComparison.Ordinal))
                    {
                        return true;
                    }
                }
            }

            return false;
        }
        private static string NormalizePermission(string? permission)
        {
            return (permission ?? string.Empty).Trim().ToLowerInvariant();
        }
    }
}
