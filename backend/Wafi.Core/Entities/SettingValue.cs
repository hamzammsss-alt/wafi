namespace Wafi.Core.Entities
{
    public class SettingValue : BaseEntity
    {
        public Guid SystemSettingId { get; set; }
        public SystemSetting? SystemSetting { get; set; }

        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? UserId { get; set; }
        public string Value { get; set; } = string.Empty;
        public Guid? UpdatedBy { get; set; }
    }
}

