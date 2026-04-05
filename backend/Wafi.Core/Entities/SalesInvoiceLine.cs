using System;

namespace Wafi.Core.Entities
{
    public class SalesInvoiceLine : BaseEntity
    {
        public Guid InvoiceId { get; set; }
        public virtual SalesInvoice? Invoice { get; set; }

        public Guid ItemId { get; set; }
        public virtual InvItem? Item { get; set; }
        
        public Guid? UnitId { get; set; } // Which UOM was sold?
        
        public string Description { get; set; } = string.Empty;
        
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Discount { get; set; }
        public decimal TaxRate { get; set; }
        
        public decimal TotalLineAmount { get; set; }
        
        public Guid? WarehouseId { get; set; }
    }
}
