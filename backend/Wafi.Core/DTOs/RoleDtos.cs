using System.ComponentModel.DataAnnotations;

namespace Wafi.Core.DTOs
{
    public class RoleDto
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> Permissions { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class UpsertRoleDto
    {
        public Guid? TenantId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public List<string> Permissions { get; set; } = new();
    }

    public class UpdateRolePermissionsDto
    {
        public List<string> Permissions { get; set; } = new();
    }

    public class PermissionDescriptorDto
    {
        public string Key { get; set; } = string.Empty;
        public string Group { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}
