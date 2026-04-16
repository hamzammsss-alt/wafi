namespace Wafi.Core.Security
{
    public sealed class DefaultRoleDefinition
    {
        public string Name { get; init; } = string.Empty;
        public string Description { get; init; } = string.Empty;
        public IReadOnlyCollection<string> Permissions { get; init; } = Array.Empty<string>();
    }

    public static class DefaultRolePermissionSets
    {
        public static IReadOnlyCollection<DefaultRoleDefinition> GetAll()
        {
            return new[]
            {
                new DefaultRoleDefinition
                {
                    Name = "Admin",
                    Description = "إدارة تشغيلية كاملة ضمن المستأجر.",
                    Permissions = new[]
                    {
                        AppPermissions.Auth.Me,
                        AppPermissions.Roles.Read,
                        AppPermissions.Roles.Manage,
                        AppPermissions.Tenants.Read,
                        AppPermissions.Sync.Push,
                        AppPermissions.Sync.Pull
                    }
                },
                new DefaultRoleDefinition
                {
                    Name = "Manager",
                    Description = "إدارة تشغيلية ومتابعة بدون تعديل الأدوار.",
                    Permissions = new[]
                    {
                        AppPermissions.Auth.Me,
                        AppPermissions.Roles.Read,
                        AppPermissions.Tenants.Read,
                        AppPermissions.Sync.Push,
                        AppPermissions.Sync.Pull
                    }
                },
                new DefaultRoleDefinition
                {
                    Name = "User",
                    Description = "مستخدم تشغيلي يومي.",
                    Permissions = new[]
                    {
                        AppPermissions.Auth.Me,
                        AppPermissions.Sync.Push,
                        AppPermissions.Sync.Pull
                    }
                },
                new DefaultRoleDefinition
                {
                    Name = "Viewer",
                    Description = "عرض فقط وسحب التحديثات.",
                    Permissions = new[]
                    {
                        AppPermissions.Auth.Me,
                        AppPermissions.Roles.Read,
                        AppPermissions.Tenants.Read,
                        AppPermissions.Sync.Pull
                    }
                }
            };
        }

        public static IReadOnlyCollection<string> GetPermissionsForRole(string roleName)
        {
            return GetAll()
                .FirstOrDefault(role => string.Equals(role.Name, roleName, StringComparison.OrdinalIgnoreCase))
                ?.Permissions
                ?.Select(permission => permission.Trim().ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray()
                ?? Array.Empty<string>();
        }
    }
}
