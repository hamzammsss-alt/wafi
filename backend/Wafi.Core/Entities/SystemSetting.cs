namespace Wafi.Core.Entities
{
    public class SystemSetting : BaseEntity
    {
        public Guid SettingsGroupId { get; set; }
        public SettingsGroup? SettingsGroup { get; set; }

        public string Key { get; set; } = string.Empty;
        public string LabelAr { get; set; } = string.Empty;
        public string LabelEn { get; set; } = string.Empty;
        public string DescriptionAr { get; set; } = string.Empty;
        public string DescriptionEn { get; set; } = string.Empty;
        public string ValueType { get; set; } = "string";
        public string InputType { get; set; } = "text";
        public string DefaultValue { get; set; } = string.Empty;
        public string OptionsJson { get; set; } = "[]";
        public string ValidationJson { get; set; } = "{}";
        public string Scope { get; set; } = "company";
        public int SortOrder { get; set; }
        public bool IsRequired { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsSensitive { get; set; }
        public bool NeedsReview { get; set; }
    }
}

