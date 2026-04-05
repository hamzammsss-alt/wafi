using System;

namespace Wafi.Core.Entities
{
    public class InvItemUnit : BaseEntity
    {
        public Guid ItemId { get; set; }
        public virtual InvItem? Item { get; set; }

        public string UnitName { get; set; } = string.Empty; // e.g. Box, Dozen
        
        // Factor relative to the Base Unit (which is always 1)
        public decimal Factor { get; set; } = 1; // e.g. 12
        
        public string Barcode { get; set; } = string.Empty; // Specific barcode for this unit
        
        // Specific pricing for this unit
        public decimal SalePrice { get; set; }
        public decimal MinSalePrice { get; set; }
        public decimal WholesalePrice { get; set; }
        
        public bool IsBaseUnit { get; set; } = false;
    }
}
