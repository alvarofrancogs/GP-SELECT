using GpSelect.Domain;
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

    [Fact]
    public void Model_has_the_video_entity_with_its_published_index_and_photo_default()
    {
        using var db = new GpSelectDbContext(new DbContextOptionsBuilder<GpSelectDbContext>()
            .UseNpgsql("Host=localhost;Database=unused").Options);
        var video = db.Model.FindEntityType(typeof(VehicleVideo));
        Assert.NotNull(video);
        var published = Assert.Single(video!.GetIndexes(), i => i.IsUnique);
        Assert.Equal("IX_Videos_VehicleUnitId_Published", published.GetDatabaseName());
        Assert.Equal("\"IsStaged\" = FALSE AND \"State\" <> 'Deleted'", published.GetFilter());
        Assert.Contains(video.GetIndexes(), i => i.Properties.Single().Name == nameof(VehicleVideo.Key));
        var kind = db.Model.FindEntityType(typeof(VehicleImage))!.FindProperty(nameof(VehicleImage.Kind))!;
        Assert.Equal(ImageKind.Photo, kind.GetDefaultValue());
        Assert.Equal(typeof(string), kind.GetProviderClrType());
    }
}
