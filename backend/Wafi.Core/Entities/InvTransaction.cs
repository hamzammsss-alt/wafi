using System;

namespace Wafi.Core.Entities
{
    public class InvTransaction : BaseEntity
    {
        public Guid TenantId { get; set; }
        
        public Guid ItemId { get; set; }
        public virtual InvItem? Item { get; set; }
        
        public Guid WarehouseId { get; set; }
        
        public string TransactionType { get; set; } = "IN"; // IN, OUT
        public string SourceDocument { get; set; } = "Invoice"; // Invoice, GRN, Adjustment
        public Guid SourceDocumentId { get; set; }
        
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; } // Cost at the time of transaction
        
        public DateTime TransactionDate { get; set; }
    }
}
