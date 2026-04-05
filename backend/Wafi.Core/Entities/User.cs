using System;

namespace Wafi.Core.Entities
{
    public class User : BaseEntity
    {
        public Guid TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }

        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        
        public string Role { get; set; } = "User"; // Admin, Manager, User, Viewer
        public bool IsActive { get; set; } = true;

        public DateTime? LastLogin { get; set; }
    }
}
