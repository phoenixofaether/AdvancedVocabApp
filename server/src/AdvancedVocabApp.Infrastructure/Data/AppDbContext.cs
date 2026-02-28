using AdvancedVocabApp.Core.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AdvancedVocabApp.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<VocabSet> VocabSets => Set<VocabSet>();
    public DbSet<VocabEntry> VocabEntries => Set<VocabEntry>();
    public DbSet<VocabSetEntry> VocabSetEntries => Set<VocabSetEntry>();
    public DbSet<DictionaryData> DictionaryData => Set<DictionaryData>();
    public DbSet<DictionaryMeaning> DictionaryMeanings => Set<DictionaryMeaning>();
    public DbSet<ReviewCard> ReviewCards => Set<ReviewCard>();
    public DbSet<ReviewHistory> ReviewHistories => Set<ReviewHistory>();
    public DbSet<AudioCache> AudioCaches => Set<AudioCache>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // VocabSetEntry - composite primary key
        builder.Entity<VocabSetEntry>(e =>
        {
            e.HasKey(x => new { x.VocabSetId, x.VocabEntryId });
            e.HasOne(x => x.VocabSet)
                .WithMany(s => s.Entries)
                .HasForeignKey(x => x.VocabSetId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.VocabEntry)
                .WithMany(v => v.SetEntries)
                .HasForeignKey(x => x.VocabEntryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DictionaryData - unique constraint on Word + Language
        builder.Entity<DictionaryData>(e =>
        {
            e.HasIndex(x => new { x.Word, x.Language }).IsUnique();
            e.Property(x => x.RawJson).HasColumnType("json");
        });

        // AudioCache - unique constraint on Word + Language + VoiceName
        builder.Entity<AudioCache>(e =>
        {
            e.HasIndex(x => new { x.Word, x.Language, x.VoiceName }).IsUnique();
        });

        // ReviewCard - unique constraint on UserId + VocabEntryId
        builder.Entity<ReviewCard>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.VocabEntryId }).IsUnique();
            e.HasOne(x => x.User)
                .WithMany(u => u.ReviewCards)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.VocabEntry)
                .WithMany(v => v.ReviewCards)
                .HasForeignKey(x => x.VocabEntryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // VocabSet
        builder.Entity<VocabSet>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany(u => u.VocabSets)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // VocabEntry
        builder.Entity<VocabEntry>(e =>
        {
            e.HasOne(x => x.DictionaryData)
                .WithMany(d => d.VocabEntries)
                .HasForeignKey(x => x.DictionaryDataId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.CreatedByUser)
                .WithMany()
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // RefreshToken
        builder.Entity<RefreshToken>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.Token);
        });

        // ReviewHistory
        builder.Entity<ReviewHistory>(e =>
        {
            e.HasOne(x => x.ReviewCard)
                .WithMany(c => c.History)
                .HasForeignKey(x => x.ReviewCardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DictionaryMeaning
        builder.Entity<DictionaryMeaning>(e =>
        {
            e.HasOne(x => x.DictionaryData)
                .WithMany(d => d.Meanings)
                .HasForeignKey(x => x.DictionaryDataId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
