using System;
using System.Collections.Generic;

namespace Wafi.Core.Entities
{
    public class SalesInvoice : BaseEntity
    {
        public Guid TenantId { get; set; }
        public Guid BranchId { get; set; }

        public string InvoiceNo { get; set; } = string.Empty; // Serial: INV-2024-0001
        public string Reference { get; set; } = string.Empty;
        
        public DateTime Date { get; set; }
        public DateTime DueDate { get; set; }
        
        public Guid CustomerId { get; set; } // We assume a Customer entity exists or will exist, for now just ID
        public string CustomerNameSnapshot { get; set; } = string.Empty; // Snapshot in case name changes
        
        public Guid? SalesmanId { get; set; }
        public Guid? CurrencyId { get; set; }
        public decimal ExchangeRate { get; set; } = 1;

        // Totals (DECIMAL 18,4)
        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        
        public string Status { get; set; } = "DRAFT"; // DRAFT, POSTED, PAID, VOID
        
        public virtual ICollection<SalesInvoiceLine> Lines { get; set; } = new List<SalesInvoiceLine>();
    }
}
