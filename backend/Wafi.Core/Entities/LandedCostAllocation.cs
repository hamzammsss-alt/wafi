using System;

namespace Wafi.Core.Entities
{
    public class LandedCostAllocation : BaseEntity
    {
        public Guid TenantId { get; set; }
        
        public Guid PurchaseInvoiceId { get; set; } // The Import Invoice
        
        public string CostName { get; set; } = string.Empty; // e.g. Customs, Freight, Insurance
        public decimal Amount { get; set; }
        
        // Allocation Method
        public string AllocationMethod { get; set; } = "Value"; // Value, Weight, Volume, Quantity
        
        public Guid RelatedGlAccountId { get; set; } // The expense account (e.g. Customs Expense)
        
        // This record indicates that 'Amount' was distributed over the items of 'PurchaseInvoiceId'
        // effectively increasing their inventory value.
    }
}
