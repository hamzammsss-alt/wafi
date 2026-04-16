namespace Wafi.API.Security
{
    public interface IPermissionResolver
    {
        Task<IReadOnlyCollection<string>> GetEffectivePermissionsAsync(Guid tenantId, string? roleName, CancellationToken cancellationToken = default);
        bool HasPermission(IReadOnlyCollection<string> permissions, string requiredPermission);
    }
}
