using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Wafi.Core.Entities;

namespace Wafi.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Kernel
        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }

        // General Ledger
        public DbSet<GlChartOfAccounts> GlChartOfAccounts { get; set; }
        public DbSet<GlJournalHeader> GlJournalHeaders { get; set; }
        public DbSet<GlJournalLine> GlJournalLines { get; set; }

        // Treasury (Cheques)
        public DbSet<ChequePortfolio> Cheques { get; set; }
        public DbSet<ChequeTransaction> ChequeTransactions { get; set; }
        
        // Inventory
        public DbSet<InvItem> Items { get; set; }
        public DbSet<InvItemUnit> ItemUnits { get; set; }
        public DbSet<InvTransaction> InventoryTransactions { get; set; }

        // Sales
        public DbSet<SalesInvoice> SalesInvoices { get; set; }
        public DbSet<SalesInvoiceLine> SalesInvoiceLines { get; set; }

        // Imports
        public DbSet<LandedCostAllocation> LandedCosts { get; set; }

        // System
        public DbSet<SyncLog> SyncLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            var stringListComparer = new ValueComparer<List<string>>(
                (left, right) =>
                    (left ?? new List<string>()).SequenceEqual(right ?? new List<string>()),
                list => (list ?? new List<string>())
                    .Aggregate(0, (hash, value) => HashCode.Combine(hash, value?.GetHashCode() ?? 0)),
                list => list == null ? new List<string>() : list.ToList());

            // Global Query Filter for Soft Delete
            modelBuilder.Entity<Tenant>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Role>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<GlChartOfAccounts>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<GlJournalHeader>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<GlJournalLine>().HasQueryFilter(e => !e.IsDeleted);

            // Precision Configuration (DECIMAL 18, 4) - SRS Mandate
            foreach (var property in modelBuilder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetPrecision(18);
                property.SetScale(4);
            }

            // Entity Configurations
            modelBuilder.Entity<User>()
                .HasOne(u => u.Tenant)
                .WithMany()
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Restrict);
                
            modelBuilder.Entity<Role>()
                .HasOne(r => r.Tenant)
                .WithMany()
                .HasForeignKey(r => r.TenantId);

            modelBuilder.Entity<Role>()
                .Property(r => r.Permissions)
                .HasColumnType("jsonb")
                .HasConversion(
                    value => JsonSerializer.Serialize(value ?? new List<string>(), (JsonSerializerOptions?)null),
                    value => string.IsNullOrWhiteSpace(value)
                        ? new List<string>()
                        : JsonSerializer.Deserialize<List<string>>(value, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(stringListComparer);

            // GL Configurations
            modelBuilder.Entity<GlChartOfAccounts>()
                .HasIndex(a => new { a.TenantId, a.AccountCode }).IsUnique();
                
            modelBuilder.Entity<GlJournalLine>()
                .HasOne(l => l.Header)
                .WithMany(h => h.Lines)
                .HasForeignKey(l => l.HeaderId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
