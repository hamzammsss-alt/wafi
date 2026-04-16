using System.Reflection;

namespace Wafi.Core.Security
{
    public static class PermissionCatalog
    {
        public static IReadOnlyCollection<string> GetAll()
        {
            var permissions = typeof(AppPermissions)
                .GetNestedTypes(BindingFlags.Public)
                .SelectMany(type =>
                    type.GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy)
                        .Where(field => field.IsLiteral && !field.IsInitOnly && field.FieldType == typeof(string))
                        .Select(field => field.GetRawConstantValue()?.ToString()))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!.Trim().ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            return permissions;
        }
    }
}
