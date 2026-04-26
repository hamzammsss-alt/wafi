using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Wafi.API.Extensions;
using Wafi.API.Security;
using Wafi.Core.DTOs;
using Wafi.Core.Entities;
using Wafi.Core.Security;
using Wafi.Infrastructure.Data;

namespace Wafi.API.Controllers
{
    [ApiController]
    [Route("settings")]
    [Route("api/settings")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        private static readonly (string Code, string NameAr, string NameEn, int SortOrder)[] SeedGroups =
        {
            ("company_information", "معلومات الشركة", "Company Information", 10),
            ("general", "عام", "General", 20),
            ("features", "خصائص", "Features", 30),
            ("manual_vouchers", "السندات اليدوية", "Manual Vouchers", 40),
            ("currency", "العملة", "Currency", 50),
            ("bank_reconciliation", "تسوية البنك", "Bank Reconciliation", 60),
            ("financial_reports", "التقارير المالية", "Financial Reports", 70),
            ("data_entry", "إدخال البيانات", "Data Entry", 80),
            ("active_periods", "الفترات الفعالة", "Active Periods", 90),
            ("inventory", "المخزون", "Inventory", 100),
            ("warehouses", "المستودعات", "Warehouses", 110),
            ("production", "الإنتاج", "Production", 120),
            ("fixed_assets", "الموجودات الثابتة", "Fixed Assets", 130),
            ("tax", "الضريبة", "Tax", 140),
            ("payroll", "الرواتب", "Payroll", 150),
            ("display_printing", "الإظهار والطباعة", "Display & Printing", 160),
            ("sales_purchase_documents", "مستندات المبيعات / المشتريات", "Sales / Purchase Documents", 170),
            ("inventory_display_printing", "إظهار وطباعة المخزون", "Inventory Display & Printing", 180),
            ("defaults", "القيم الافتراضية", "Defaults", 190),
            ("html_templates", "نماذج HTML", "HTML Templates", 200),
            ("header_name_address", "الترويسة / اسم وعنوان", "Header / Name & Address", 210),
            ("footer", "التذييل", "Footer", 220),
            ("customer_balance_print_format", "تنسيق طباعة رصيد الزبون", "Customer Balance Print Format", 230),
            ("employee_attendance_error_template", "نموذج أخطاء الدوام للموظف", "Employee Attendance Error Template", 240),
            ("bills_of_exchange", "كمبيالات", "Bills of Exchange", 250),
            ("sms_templates", "نماذج الرسائل القصيرة SMS", "SMS Templates", 260),
            ("sms_creditor", "رسالة قصيرة للدائن", "Creditor SMS", 270),
            ("sms_debtor", "رسالة قصيرة للمدين", "Debtor SMS", 280),
            ("customer_balance", "رصيد الزبون", "Customer Balance", 290),
            ("bisan_services_api", "إعدادات خدمات بيسان / API", "Bisan Services / API", 300),
            ("security", "الحماية", "Security", 310),
            ("timezone", "إعدادات المنطقة الزمنية", "Timezone Settings", 320),
        };

        private static readonly (string GroupCode, string Key, string LabelAr, string LabelEn, string ValueType, string InputType, string DefaultValue, int SortOrder, bool NeedsReview)[] SeedSettings =
        {
            ("company_information", "company_name_ar", "اسم الشركة عربي", "Company Name Arabic", "string", "text", "WAFI ERP", 10, false),
            ("company_information", "tax_id", "الرقم الضريبي", "Tax ID", "string", "text", "", 20, false),
            ("general", "general.language", "لغة الواجهة", "UI Language", "select", "select", "ar", 10, false),
            ("currency", "currency.base_currency", "العملة الأساسية", "Base Currency", "select", "select", "ILS", 10, false),
            ("tax", "VAT_RATE", "نسبة ضريبة القيمة المضافة", "VAT Rate", "number", "number", "16", 10, false),
            ("inventory", "INVENTORY_COSTING_METHOD", "طريقة تقييم المخزون", "Inventory Costing Method", "select", "select", "WAC", 10, false),
            ("display_printing", "printer", "الطابعة الافتراضية", "Default Printer", "string", "text", "Default", 10, false),
            ("security", "security.audit_settings_changes", "تسجيل تعديلات الإعدادات", "Audit Settings Changes", "boolean", "checkbox", "true", 10, false),
            ("timezone", "timezone.default_timezone", "المنطقة الزمنية", "Timezone", "select", "select", "Asia/Hebron", 10, false),
            ("bisan_services_api", "bisan_services_api.base_url", "رابط خدمة بيسان", "Bisan API Base URL", "string", "text", "", 10, true),
        };

        public SettingsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [HasPermission(AppPermissions.Settings.Read)]
        public async Task<ActionResult<SettingsResponseDto>> GetSettings([FromQuery] SettingsScopeDto query)
        {
            if (!TryResolveTenantScope(query.TenantId, out var tenantId, out var errorResult))
            {
                return errorResult!;
            }

            await EnsureSeedAsync();
            return Ok(await BuildResponseAsync(tenantId, query.BranchId, query.UserId));
        }

        [HttpGet("{section}")]
        [HasPermission(AppPermissions.Settings.Read)]
        public async Task<ActionResult<SettingsGroupDto>> GetSection(string section, [FromQuery] SettingsScopeDto query)
        {
            if (!TryResolveTenantScope(query.TenantId, out var tenantId, out var errorResult))
            {
                return errorResult!;
            }

            await EnsureSeedAsync();
            var response = await BuildResponseAsync(tenantId, query.BranchId, query.UserId);
            var group = response.Groups.FirstOrDefault(g => string.Equals(g.Code, section, StringComparison.OrdinalIgnoreCase));
            return group == null ? NotFound(new { error = "Settings section not found" }) : Ok(group);
        }

        [HttpPut("{section}")]
        [HasPermission(AppPermissions.Settings.Manage)]
        public async Task<IActionResult> PutSection(string section, [FromBody] UpdateSectionSettingsDto request)
        {
            if (!TryResolveTenantScope(request.TenantId, out var tenantId, out var errorResult))
            {
                return errorResult!;
            }

            await EnsureSeedAsync();
            var settings = await _context.Settings
                .Include(s => s.SettingsGroup)
                .Where(s => s.SettingsGroup != null && s.SettingsGroup.Code == section)
                .ToListAsync();

            if (settings.Count == 0)
            {
                return NotFound(new { error = "Settings section not found" });
            }

            var byKey = settings.ToDictionary(s => s.Key, StringComparer.OrdinalIgnoreCase);
            foreach (var pair in request.Values)
            {
                if (!byKey.TryGetValue(pair.Key, out var setting))
                {
                    return BadRequest(new { error = $"Setting does not belong to section: {pair.Key}" });
                }

                await UpsertValueAsync(setting, tenantId, request.BranchId, request.UserId, pair.Value);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, section, changedCount = request.Values.Count });
        }

        [HttpPatch("{key}")]
        [HasPermission(AppPermissions.Settings.Manage)]
        public async Task<IActionResult> PatchSetting(string key, [FromBody] PatchSettingDto request)
        {
            if (!TryResolveTenantScope(request.TenantId, out var tenantId, out var errorResult))
            {
                return errorResult!;
            }

            await EnsureSeedAsync();
            var setting = await _context.Settings.Include(s => s.SettingsGroup).FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
            {
                return NotFound(new { error = "Setting not found" });
            }

            await UpsertValueAsync(setting, tenantId, request.BranchId, request.UserId, request.Value);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, key });
        }

        private async Task<SettingsResponseDto> BuildResponseAsync(Guid tenantId, Guid? branchId, Guid? userId)
        {
            var groups = await _context.SettingsGroups
                .AsNoTracking()
                .Where(g => g.IsActive)
                .OrderBy(g => g.SortOrder)
                .ToListAsync();

            var settings = await _context.Settings
                .AsNoTracking()
                .Include(s => s.SettingsGroup)
                .Where(s => s.IsActive)
                .OrderBy(s => s.SortOrder)
                .ToListAsync();

            var settingIds = settings.Select(s => s.Id).ToList();
            var values = await _context.SettingValues
                .AsNoTracking()
                .Where(v =>
                    settingIds.Contains(v.SystemSettingId) &&
                    v.TenantId == tenantId &&
                    (v.BranchId == null || v.BranchId == branchId) &&
                    (v.UserId == null || v.UserId == userId))
                .ToListAsync();

            return new SettingsResponseDto
            {
                Scope = new SettingsScopeDto { TenantId = tenantId, BranchId = branchId, UserId = userId },
                Groups = groups.Select(group => new SettingsGroupDto
                {
                    Code = group.Code,
                    NameAr = group.NameAr,
                    NameEn = group.NameEn,
                    SortOrder = group.SortOrder,
                    Settings = settings
                        .Where(setting => setting.SettingsGroupId == group.Id)
                        .Select(setting => MapSetting(setting, ResolveValue(setting, values, branchId, userId)))
                        .ToList()
                }).ToList()
            };
        }

        private static (string Value, string Source) ResolveValue(SystemSetting setting, List<SettingValue> values, Guid? branchId, Guid? userId)
        {
            var exactUser = values.FirstOrDefault(v => v.SystemSettingId == setting.Id && userId.HasValue && v.UserId == userId);
            if (exactUser != null) return (exactUser.Value, "user");

            var exactBranch = values.FirstOrDefault(v => v.SystemSettingId == setting.Id && branchId.HasValue && v.BranchId == branchId && v.UserId == null);
            if (exactBranch != null) return (exactBranch.Value, "branch");

            var company = values.FirstOrDefault(v => v.SystemSettingId == setting.Id && v.BranchId == null && v.UserId == null);
            return company != null ? (company.Value, "company") : (setting.DefaultValue, "default");
        }

        private static SettingDto MapSetting(SystemSetting setting, (string Value, string Source) resolved)
        {
            return new SettingDto
            {
                Key = setting.Key,
                GroupCode = setting.SettingsGroup?.Code ?? string.Empty,
                LabelAr = setting.LabelAr,
                LabelEn = setting.LabelEn,
                DescriptionAr = setting.DescriptionAr,
                DescriptionEn = setting.DescriptionEn,
                ValueType = setting.ValueType,
                InputType = setting.InputType,
                Value = resolved.Value,
                DefaultValue = setting.DefaultValue,
                OptionsJson = setting.OptionsJson,
                ValidationJson = setting.ValidationJson,
                Scope = setting.Scope,
                IsRequired = setting.IsRequired,
                IsSensitive = setting.IsSensitive,
                NeedsReview = setting.NeedsReview,
                Source = resolved.Source
            };
        }

        private async Task UpsertValueAsync(SystemSetting setting, Guid tenantId, Guid? branchId, Guid? userId, JsonElement rawValue)
        {
            var newValue = NormalizeJsonElement(rawValue);
            ValidateValue(setting, newValue);

            var value = await _context.SettingValues.FirstOrDefaultAsync(v =>
                v.SystemSettingId == setting.Id &&
                v.TenantId == tenantId &&
                v.BranchId == branchId &&
                v.UserId == userId);

            var oldValue = value?.Value ?? setting.DefaultValue;
            var changedBy = User.GetUserId();

            if (value == null)
            {
                value = new SettingValue
                {
                    Id = Guid.NewGuid(),
                    SystemSettingId = setting.Id,
                    TenantId = tenantId,
                    BranchId = branchId,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.SettingValues.Add(value);
            }

            value.Value = newValue;
            value.UpdatedBy = changedBy;
            value.UpdatedAt = DateTime.UtcNow;

            _context.SettingAuditLogs.Add(new SettingAuditLog
            {
                Id = Guid.NewGuid(),
                SettingKey = setting.Key,
                SectionCode = setting.SettingsGroup?.Code ?? string.Empty,
                TenantId = tenantId,
                BranchId = branchId,
                UserId = userId,
                ChangedBy = changedBy,
                OldValue = oldValue,
                NewValue = newValue,
                CreatedAt = DateTime.UtcNow
            });
        }

        private static void ValidateValue(SystemSetting setting, string value)
        {
            if (setting.IsRequired && string.IsNullOrWhiteSpace(value))
            {
                throw new BadHttpRequestException($"Setting is required: {setting.Key}", StatusCodes.Status400BadRequest);
            }

            if (string.Equals(setting.ValueType, "number", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(value) &&
                !decimal.TryParse(value, out _))
            {
                throw new BadHttpRequestException($"Setting must be numeric: {setting.Key}", StatusCodes.Status400BadRequest);
            }
        }

        private static string NormalizeJsonElement(JsonElement value)
        {
            return value.ValueKind switch
            {
                JsonValueKind.String => value.GetString() ?? string.Empty,
                JsonValueKind.Number => value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => string.Empty,
                JsonValueKind.Undefined => string.Empty,
                _ => value.GetRawText()
            };
        }

        private async Task EnsureSeedAsync()
        {
            if (await _context.SettingsGroups.AnyAsync())
            {
                return;
            }

            var groupMap = new Dictionary<string, SettingsGroup>(StringComparer.OrdinalIgnoreCase);
            foreach (var seed in SeedGroups)
            {
                var group = new SettingsGroup
                {
                    Id = Guid.NewGuid(),
                    Code = seed.Code,
                    NameAr = seed.NameAr,
                    NameEn = seed.NameEn,
                    SortOrder = seed.SortOrder,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                groupMap[group.Code] = group;
                _context.SettingsGroups.Add(group);
            }

            foreach (var seed in SeedSettings)
            {
                if (!groupMap.TryGetValue(seed.GroupCode, out var group)) continue;
                _context.Settings.Add(new SystemSetting
                {
                    Id = Guid.NewGuid(),
                    SettingsGroupId = group.Id,
                    Key = seed.Key,
                    LabelAr = seed.LabelAr,
                    LabelEn = seed.LabelEn,
                    ValueType = seed.ValueType,
                    InputType = seed.InputType,
                    DefaultValue = seed.DefaultValue,
                    OptionsJson = "[]",
                    ValidationJson = "{}",
                    Scope = "company",
                    SortOrder = seed.SortOrder,
                    NeedsReview = seed.NeedsReview,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
        }

        private bool TryResolveTenantScope(Guid? requestedTenantId, out Guid tenantId, out IActionResult? errorResult)
        {
            tenantId = Guid.Empty;
            errorResult = null;

            var currentTenantId = User.GetTenantId();
            var isSuperAdmin = User.HasRole("SuperAdmin");

            if (isSuperAdmin)
            {
                tenantId = requestedTenantId ?? currentTenantId ?? Guid.Empty;
                if (tenantId == Guid.Empty)
                {
                    errorResult = BadRequest(new { error = "TenantId is required for this request" });
                    return false;
                }

                return true;
            }

            if (currentTenantId is null)
            {
                errorResult = Forbid();
                return false;
            }

            if (requestedTenantId.HasValue && requestedTenantId.Value != currentTenantId.Value)
            {
                errorResult = Forbid();
                return false;
            }

            tenantId = currentTenantId.Value;
            return true;
        }
    }
}

