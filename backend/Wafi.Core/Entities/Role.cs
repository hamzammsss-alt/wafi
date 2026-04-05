using System;
using System.Collections.Generic;

namespace Wafi.Core.Entities
{
    public class Role : BaseEntity
    {
        public Guid TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }

        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        
        // Storing permissions as a JSON array of strings (e.g. ["sales.create", "gl.view"])
        public List<string> Permissions { get; set; } = new List<string>();
    }
}
