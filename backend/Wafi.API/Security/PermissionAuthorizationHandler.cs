using Microsoft.AspNetCore.Authorization;
using Wafi.API.Extensions;

namespace Wafi.API.Security
{
    public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly IPermissionResolver _permissionResolver;

        public PermissionAuthorizationHandler(IPermissionResolver permissionResolver)
        {
            _permissionResolver = permissionResolver;
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionRequirement requirement)
        {
            if (context.User?.Identity?.IsAuthenticated != true)
            {
                return;
            }

            if (context.User.HasRole("SuperAdmin"))
            {
                context.Succeed(requirement);
                return;
            }

            var tenantId = context.User.GetTenantId();
            var roleName = context.User.GetRoleName();

            if (tenantId is null || string.IsNullOrWhiteSpace(roleName))
            {
                return;
            }

            var permissions = await _permissionResolver.GetEffectivePermissionsAsync(tenantId.Value, roleName);
            if (_permissionResolver.HasPermission(permissions, requirement.Permission))
            {
                context.Succeed(requirement);
            }
        }
    }
}
