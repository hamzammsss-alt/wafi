using System;

namespace Wafi.Core.Entities
{
    public enum ChequeStatus
    {
        OnHand, // In Box
        UnderCollection, // At Bank
        Collected, // Cleared
        Bounced, // Rejected
        Endorsed, // Paid to Vendor
        ReturnedToCustomer // Returned
    }

    public class ChequePortfolio : BaseEntity
    {
        public Guid TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }
        public Guid BranchId { get; set; }

        public string ChequeNo { get; set; } = string.Empty;
        public string BankName { get; set; } = string.Empty;
        public string DrawerName { get; set; } = string.Empty; // Name on the cheque
        
        public decimal Amount { get; set; }
        public Guid CurrencyId { get; set; }
        
        public DateTime DueDate { get; set; }
        public DateTime ReceivedDate { get; set; }
        
        public ChequeStatus Status { get; set; } = ChequeStatus.OnHand;
        
        // Links
        public Guid? CustomerId { get; set; } // Received From
        public Guid? VendorId { get; set; } // Endorsed To (if applicable)
        
        // For tracking the image
        public string? FrontImageUrl { get; set; }
        public string? BackImageUrl { get; set; }
    }
}
