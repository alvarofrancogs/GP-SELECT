using GpSelect.Domain; using Xunit;
namespace GpSelect.Tests;

public class VehicleVideoTests
{
    private static VehicleImage Photo(Guid vehicle, int order, bool cover = false)
    {
        var photo = VehicleImage.Create(vehicle, $"p{order}.jpg", "image/jpeg", 10);
        photo.Ready("card.jpg", "detail.jpg"); photo.Order(order); photo.SetCover(cover);
        return photo;
    }

    private static VehicleImage Poster(Guid vehicle, bool ready = true, bool published = true)
    {
        var poster = VehicleImage.CreatePoster(vehicle, Guid.NewGuid(), "poster.jpg", "image/jpeg", 10);
        if (ready) poster.Ready("card.jpg", "detail.jpg");
        if (published) poster.Publish();
        return poster;
    }

    [Fact]
    public void Ready_published_poster_takes_the_cover_from_the_first_photo()
    {
        var v = Guid.NewGuid(); var photo = Photo(v, 0, cover: true); var poster = Poster(v);
        var cover = VehicleGallery.EnsureCover([photo, poster]);
        Assert.Same(poster, cover); Assert.True(poster.IsCover); Assert.False(photo.IsCover);
    }

    [Fact]
    public void Staged_or_processing_poster_never_takes_the_cover()
    {
        var v = Guid.NewGuid(); var photo = Photo(v, 0, cover: true);
        var staged = Poster(v, published: false); var processing = Poster(v, ready: false);
        Assert.Null(VehicleGallery.EnsureCover([photo, staged, processing]));
        Assert.True(photo.IsCover); Assert.False(staged.IsCover); Assert.False(processing.IsCover);
    }

    [Fact]
    public void Removing_the_poster_gives_the_cover_back_to_the_first_photo()
    {
        var v = Guid.NewGuid(); var photo = Photo(v, 0); var poster = Poster(v);
        VehicleGallery.EnsureCover([photo, poster]);
        poster.Delete();
        VehicleGallery.EnsureCover([photo, poster]);
        Assert.True(photo.IsCover);
    }

    [Fact]
    public void Reorder_ignores_posters()
    {
        var v = Guid.NewGuid(); var a = Photo(v, 0); var b = Photo(v, 1); var poster = Poster(v);
        VehicleGallery.EnsureCover([a, b, poster]);
        VehicleGallery.Reorder([a, b, poster], [b.Id, a.Id]);
        Assert.True(poster.IsCover); Assert.Equal(0, b.SortOrder); Assert.Equal(1, a.SortOrder);
    }

    [Fact]
    public void Poster_satisfies_the_publication_cover_rule()
    {
        var vehicle = VehicleUnit.Create("Porsche", "911", 2020, null, "porsche-911-x");
        vehicle.Apply(new VehicleChanges { PriceEur = 100000m });
        var poster = Poster(vehicle.Id);
        VehicleGallery.EnsureCover([poster]);
        vehicle.ChangeStatus(VehicleStatus.Available, [poster]);
        Assert.Equal(VehicleStatus.Available, vehicle.Status);
    }

    [Fact]
    public void Mp4_signature()
    {
        Assert.True(VideoRules.HasMp4Signature([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]));
        Assert.False(VideoRules.HasMp4Signature([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
        Assert.False(VideoRules.HasMp4Signature([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79]));
    }

    [Fact]
    public void Video_key_is_under_the_vehicle()
    {
        var v = Guid.NewGuid(); var video = VehicleVideo.Create(v, 10);
        Assert.Equal($"vehicles/{v}/videos/{video.Id:N}.mp4", video.Key);
        Assert.True(video.IsStaged); Assert.Equal(VideoState.PendingUpload, video.State);
    }
}
