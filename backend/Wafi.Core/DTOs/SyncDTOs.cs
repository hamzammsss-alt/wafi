using System;
using System.Text.Json;
using System.Collections.Generic;

namespace Wafi.Core.DTOs
{
    // What the client sends when it wants to PUSH changes
    public class PushChangesRequest
    {
        public Guid DeviceId { get; set; }
        public List<EntityChangeDto> Changes { get; set; } = new List<EntityChangeDto>();
    }

    public class EntityChangeDto
    {
        public Guid Id { get; set; } // The Record ID (UUID)
        public string EntityType { get; set; } = string.Empty; // "Invoice", "Customer"
        public string Operation { get; set; } = "UPDATE"; // INSERT, UPDATE, DELETE
        public JsonElement Data { get; set; } // The actual payload
        public DateTime Timestamp { get; set; }
    }

    // What the client sends when it wants to PULL updates
    public class PullUpdatesRequest
    {
        public Guid TenantId { get; set; }
        public DateTime LastSyncTimestamp { get; set; }
    }

    // What the server returns
    public class PullUpdatesResponse
    {
        public DateTime NewSyncTimestamp { get; set; }
        public List<EntityChangeDto> Updates { get; set; } = new List<EntityChangeDto>();
    }
}
