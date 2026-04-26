namespace Wafi.Core.Entities
{
    public class SettingsGroup : BaseEntity
    {
        public string Code { get; set; } = string.Empty;
        public string NameAr { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string DescriptionAr { get; set; } = string.Empty;
        public string DescriptionEn { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;

        public List<SystemSetting> Settings { get; set; } = new();
    }
}

