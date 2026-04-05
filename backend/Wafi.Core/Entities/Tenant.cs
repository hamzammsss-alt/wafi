using System;

namespace Wafi.Core.Entities
{
    public class Tenant : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string TaxNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        
        // Subscription Info
        public string PlanType { get; set; } = "Free"; // Free, Pro, Enterprise
        public DateTime SubscriptionExpiresAt { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
