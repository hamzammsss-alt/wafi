using System;

namespace Wafi.Core.Entities
{
    public class GlChartOfAccounts : BaseEntity
    {
        public Guid TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }

        public string AccountCode { get; set; } = string.Empty;
        public string NameAr { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;

        // Tree Structure
        public Guid? ParentId { get; set; }
        public virtual GlChartOfAccounts? Parent { get; set; }
        
        public bool IsTransactional { get; set; } = true; // Can post to this account?
        public int Level { get; set; } // 1, 2, 3...
        
        public string AccountType { get; set; } = "BalanceSheet"; // BalanceSheet, P&L
        public string Nature { get; set; } = "Debit"; // Debit, Credit
        
        public Guid? CurrencyId { get; set; } // Null = All Currencies
        public bool RequiresCostCenter { get; set; } = false;
        
        public bool IsActive { get; set; } = true;
    }
}
