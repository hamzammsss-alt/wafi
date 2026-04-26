namespace Wafi.Core.Entities
{
    public class SettingAuditLog : BaseEntity
    {
        public string SettingKey { get; set; } = string.Empty;
        public string SectionCode { get; set; } = string.Empty;
        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? UserId { get; set; }
        public Guid? ChangedBy { get; set; }
        public string OldValue { get; set; } = string.Empty;
        public string NewValue { get; set; } = string.Empty;
    }
}

