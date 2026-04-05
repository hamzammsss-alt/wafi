using System;
using System.Collections.Generic;

namespace Wafi.Core.Entities
{
    public class GlJournalHeader : BaseEntity
    {
        public Guid TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }

        public Guid BranchId { get; set; } // The branch that owns this voucher

        public string VoucherNo { get; set; } = string.Empty; // Human readable ID (JV-2024-0001)
        public string VoucherType { get; set; } = "JV"; // JV, PV, RV...
        
        public DateTime Date { get; set; }
        public DateTime? DueDate { get; set; }
        
        public string Reference { get; set; } = string.Empty; // External Ref
        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "DRAFT"; // DRAFT, POSTED, VOID
        
        public int FiscalYear { get; set; }
        
        public virtual ICollection<GlJournalLine> Lines { get; set; } = new List<GlJournalLine>();
    }
}
