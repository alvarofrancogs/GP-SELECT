using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GpSelect.Tests;

public sealed class MigrationModelTests
{
    [Fact]
    public void Snapshot_matches_the_current_model()
    {
        using var db = new GpSelectDbContext(new DbContextOptionsBuilder<GpSelectDbContext>()
            .UseNpgsql("Host=localhost;Database=unused").Options);
        Assert.False(db.Database.HasPendingModelChanges());
    }
}
