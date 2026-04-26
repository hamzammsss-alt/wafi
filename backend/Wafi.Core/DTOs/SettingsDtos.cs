using System.Text.Json;

namespace Wafi.Core.DTOs
{
    public class SettingsScopeDto
    {
        public Guid? TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? UserId { get; set; }
    }

    public class SettingOptionDto
    {
        public string Value { get; set; } = string.Empty;
        public string LabelAr { get; set; } = string.Empty;
        public string LabelEn { get; set; } = string.Empty;
    }

    public class SettingDto
    {
        public string Key { get; set; } = string.Empty;
        public string GroupCode { get; set; } = string.Empty;
        public string LabelAr { get; set; } = string.Empty;
        public string LabelEn { get; set; } = string.Empty;
        public string DescriptionAr { get; set; } = string.Empty;
        public string DescriptionEn { get; set; } = string.Empty;
        public string ValueType { get; set; } = "string";
        public string InputType { get; set; } = "text";
        public string Value { get; set; } = string.Empty;
        public string DefaultValue { get; set; } = string.Empty;
        public string OptionsJson { get; set; } = "[]";
        public string ValidationJson { get; set; } = "{}";
        public string Scope { get; set; } = "company";
        public bool IsRequired { get; set; }
        public bool IsSensitive { get; set; }
        public bool NeedsReview { get; set; }
        public string Source { get; set; } = "default";
    }

    public class SettingsGroupDto
    {
        public string Code { get; set; } = string.Empty;
        public string NameAr { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public List<SettingDto> Settings { get; set; } = new();
    }

    public class SettingsResponseDto
    {
        public SettingsScopeDto Scope { get; set; } = new();
        public List<SettingsGroupDto> Groups { get; set; } = new();
    }

    public class UpdateSectionSettingsDto : SettingsScopeDto
    {
        public Dictionary<string, JsonElement> Values { get; set; } = new();
    }

    public class PatchSettingDto : SettingsScopeDto
    {
        public JsonElement Value { get; set; }
    }
}

