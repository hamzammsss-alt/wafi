using System;

namespace Wafi.Core.Entities
{
    public class ChequeTransaction : BaseEntity
    {
        public Guid ChequeId { get; set; }
        public virtual ChequePortfolio? Cheque { get; set; }

        public ChequeStatus OldStatus { get; set; }
        public ChequeStatus NewStatus { get; set; }
        
        public DateTime TransactionDate { get; set; }
        public Guid PerformedByUserId { get; set; }
        
        public string? Notes { get; set; }
        
        // Link to the Journal Entry created by this movement
        public Guid? JournalHeaderId { get; set; }
    }
}
