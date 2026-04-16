using Microsoft.AspNetCore.Authorization;

namespace Wafi.API.Security
{
    public sealed class HasPermissionAttribute : AuthorizeAttribute
    {
        public const string PolicyPrefix = "Permission:";

        public HasPermissionAttribute(string permission)
        {
            Permission = permission;
        }

        public string Permission
        {
            get => Policy?.StartsWith(PolicyPrefix, StringComparison.Ordinal) == true
                ? Policy[PolicyPrefix.Length..]
                : string.Empty;
            set => Policy = $"{PolicyPrefix}{value}";
        }
    }
}
