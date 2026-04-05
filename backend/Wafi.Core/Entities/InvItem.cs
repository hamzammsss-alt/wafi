using System;

namespace Wafi.Core.Entities
{
    public class InvItem : BaseEntity
    {
        public Guid TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }

        public string Sku { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        
        public string NameAr { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        
        public string Type { get; set; } = "Inventory"; // Inventory, Service, Kit
        
        // Pricing (Base Price)
        public decimal SalePrice { get; set; }
        public decimal CostPrice { get; set; } // Last Purchase Cost
        public decimal WeightedAverageCost { get; set; } // Avg Cost
        
        public Guid? CategoryId { get; set; }
        public Guid? BrandId { get; set; }
        
        public bool IsTaxable { get; set; } = true;
        public decimal TaxRate { get; set; } = 0.16m;
    }
}
