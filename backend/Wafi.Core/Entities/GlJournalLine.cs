using System;

namespace Wafi.Core.Entities
{
    public class GlJournalLine : BaseEntity
    {
        public Guid HeaderId { get; set; }
        public virtual GlJournalHeader? Header { get; set; }

        public Guid AccountId { get; set; }
        public virtual GlChartOfAccounts? Account { get; set; }

        // Financials - MUST BE DECIMAL(18,4) in Database
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        
        public Guid? CurrencyId { get; set; }
        public decimal ExchangeRate { get; set; } = 1;
        
        public string LineDescription { get; set; } = string.Empty;
        
        public Guid? CostCenterId { get; set; }
        public Guid? ProjectId { get; set; }
    }
}
