using System;

namespace Wafi.Core.Entities
{
    public class SyncLog : BaseEntity
    {
        public Guid TenantId { get; set; }
        
        public string EntityType { get; set; } = string.Empty; // "InvItem", "SalesInvoice"
        public Guid EntityId { get; set; }
        
        public string Operation { get; set; } = "UPDATE"; // INSERT, UPDATE, DELETE, SOFT_DELETE
        
        public string JsonData { get; set; } = string.Empty; // Snapshot of the data at that time (optional, or just use current state)
        
        public Guid? DeviceId { get; set; } // Who made this change?
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
