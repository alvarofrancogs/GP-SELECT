using System.ComponentModel.DataAnnotations;
using GpSelect.Domain;
namespace GpSelect.Application;

public sealed record CreateVehicleRequest(string Make, string Model, int FirstRegistrationYear, int? FirstRegistrationMonth, string? InternalReference);
/// <summary>PATCH body with merge-patch semantics: send only the properties that change.</summary>
public sealed record UpdateVehicleRequest : VehicleChanges;
/// <summary>Status is required (a missing enum would otherwise read as Draft).</summary>
public sealed record StatusChangeRequest([Required] VehicleStatus? Status);
/// <summary>Final order of every saved photo the vehicle keeps plus the staged ones to publish, and the photos to
/// remove. Staged photos not in the order stay staged; without an order no staged photo is published.</summary>
public sealed record GalleryChanges(IReadOnlyList<Guid>? Order, IReadOnlyList<Guid>? Removed);
/// <summary>The video the vehicle keeps: a staged, ready video to publish (replacing the current one), the current
/// one (no change), or null to remove it. Its poster follows it.</summary>
public sealed record VideoChanges(Guid? Keep);
/// <summary>Everything the editor changed, saved at once. Each part is optional; Changes has merge-patch semantics.</summary>
public sealed record SaveVehicleRequest(UpdateVehicleRequest? Changes, GalleryChanges? Gallery, StatusChangeRequest? Status, VideoChanges? Video = null);
public interface ISlugGenerator { string Generate(string make, string model); }
/// <summary>Public contact form. Exactly the form's fields; all nullable so the domain answers with a per-field problem.</summary>
// Language is optional so a page cached before it existed still sends; Spanish is the default.
public sealed record CreateEnquiryRequest(EnquiryIntent? Intent, string? Name, string? Email, string? Phone, string? Vehicle, string? Message, EnquiryLanguage? Language = null, string? Budget = null, string? Delivery = null, string? Year = null, string? Mileage = null, string? Timeframe = null);

public sealed record VehicleAdminListDto(Guid Id, string Slug, VehicleStatus Status, string Make, string Model, string? Variant, int Year, int? Month,
    int? MileageKm, int? PowerHp, decimal? PriceEur, string? InternalReference, string? CoverCardUrl, int ImageCount, int ReadyImageCount,
    DateTimeOffset UpdatedAt, DateTimeOffset? PublishedAt);
public sealed record VehicleAdminDto(Guid Id, string Slug, VehicleStatus Status, string Make, string Model, int Year, int? Month, decimal? PriceEur,
    string? InternalReference, string? Description, int? MileageKm, int? PowerHp, string? Variant, string? FuelType, string? Transmission,
    string? BodyType, string? Drivetrain, string? ExteriorColour, string? Interior, string? History, string? Provenance,
    IReadOnlyList<string> Equipment, IReadOnlyList<VehicleSpecification> CustomSpecifications, IReadOnlyList<ImageAdminDto> Images,
    IReadOnlyList<VideoAdminDto> Videos, DateTimeOffset UpdatedAt, DateTimeOffset? PublishedAt);
/// <summary><c>JobPending</c>: the worker still has a queued, running or retryable job for the photo, so its state will change.</summary>
public sealed record ImageAdminDto(Guid Id, ImageState State, string? CardUrl, string? DetailUrl, bool IsCover, int SortOrder, string? FailureReason, bool IsStaged, bool JobPending, ImageKind Kind);
/// <summary>A video not deleted: the saved one and any staged uploads. <c>PosterImageId</c> is its frame-0 image, once uploaded.</summary>
public sealed record VideoAdminDto(Guid Id, VideoState State, bool IsStaged, long SizeBytes, string Url, Guid? PosterImageId);

// Public contracts. Internal fields (InternalReference, Vin, InternalNotes, PurchaseCostEur) never appear here.
public sealed record VehiclePublicCardDto(string Slug, string Make, string Model, string? Variant, int Year, int? Month, decimal? PriceEur,
    int? MileageKm, int? PowerHp, string? FuelType, string? Transmission, string? BodyType, VehicleStatus Status, IReadOnlyList<string> Images, string? VideoUrl);
public sealed record VehiclePublicDto(string Slug, string Make, string Model, string? Variant, int Year, int? Month, decimal? PriceEur,
    int? MileageKm, int? PowerHp, string? FuelType, string? Transmission, string? BodyType, string? Drivetrain, string? ExteriorColour,
    string? Interior, string? Description, string? History, string? Provenance, IReadOnlyList<string> Equipment,
    IReadOnlyList<VehicleSpecification> CustomSpecifications, VehicleStatus Status, IReadOnlyList<string> Images,
    IReadOnlyList<string> CardImages, string? VideoUrl);

public static class PublicMapping
{
    private static string Base(VehicleUnit v) => $"/api/public/vehicles/{Uri.EscapeDataString(v.PublicSlug)}/images";
    // A sold vehicle's price is never shown, so it is not published either (nor counted in the catalogue's price filters).
    private static decimal? PublicPrice(VehicleUnit v) => v.Status == VehicleStatus.Sold ? null : v.PriceEur;

    private static bool IsVideoCover(VehicleUnit v, VehicleImage image, VehicleVideo? video) =>
        video is { IsStaged: false, State: VideoState.Ready } && video.VehicleUnitId == v.Id
        && image.VehicleUnitId == v.Id && image.Kind == ImageKind.VideoPoster && image.VideoId == video.Id
        && image.State == ImageState.Ready && !image.IsStaged && image.IsCover;

    private static List<VehicleImage> Gallery(VehicleUnit v, IEnumerable<VehicleImage> images, VehicleVideo? video, bool detail) =>
        VehicleGallery.InPublicOrder(images.Where(x => x.State == ImageState.Ready && !x.IsStaged
            && x.CardKey is not null && (!detail || x.DetailKey is not null)
            // Without a usable video cover, the gallery starts with a photo.
            && (x.Kind == ImageKind.Photo || IsVideoCover(v, x, video)))).ToList();

    private static string? VideoUrl(VehicleUnit v, IReadOnlyList<VehicleImage> gallery, VehicleVideo? video) =>
        gallery.Count > 0 && IsVideoCover(v, gallery[0], video)
            ? $"/api/public/vehicles/{Uri.EscapeDataString(v.PublicSlug)}/video/{video!.Id}" : null;

    // CardImages holds the 800 px version of each photo, in the same order as Images (thumbnails, small screens).
    public static VehiclePublicDto Map(VehicleUnit v, IEnumerable<VehicleImage> images, VehicleVideo? video)
    {
        var gallery = Gallery(v, images, video, detail: true);
        return new(
            v.PublicSlug, v.Make, v.Model, v.Variant, v.FirstRegistrationYear, v.FirstRegistrationMonth, PublicPrice(v),
            v.MileageKm, v.PowerHp, v.FuelType, v.Transmission, v.BodyType, v.Drivetrain, v.ExteriorColour,
            v.Interior, v.Description, v.History, v.Provenance, VehicleContent.ReadEquipment(v.EquipmentJson),
            VehicleContent.ReadSpecifications(v.CustomSpecificationsJson), v.Status,
            gallery.Select(x => $"{Base(v)}/{x.Id}/detail").ToList(),
            gallery.Select(x => $"{Base(v)}/{x.Id}/card").ToList(), VideoUrl(v, gallery, video));
    }

    public static VehiclePublicCardDto MapCard(VehicleUnit v, IEnumerable<VehicleImage> images, VehicleVideo? video)
    {
        var gallery = Gallery(v, images, video, detail: false);
        return new(
            v.PublicSlug, v.Make, v.Model, v.Variant, v.FirstRegistrationYear, v.FirstRegistrationMonth, PublicPrice(v),
            v.MileageKm, v.PowerHp, v.FuelType, v.Transmission, v.BodyType, v.Status,
            gallery.Select(x => $"{Base(v)}/{x.Id}/card").ToList(), VideoUrl(v, gallery, video));
    }
}

public static class AdminMapping
{
    private static string Base(VehicleUnit v) => $"/api/admin/vehicles/{v.Id}/images";

    public static ImageAdminDto MapImage(VehicleUnit v, VehicleImage x, bool jobPending = false) => new(x.Id, x.State,
        x.State == ImageState.Ready ? $"{Base(v)}/{x.Id}/card" : null,
        x.State == ImageState.Ready ? $"{Base(v)}/{x.Id}/detail" : null, x.IsCover, x.SortOrder, x.FailureReason, x.IsStaged, jobPending, x.Kind);

    /// <summary>Images must already be loaded for this vehicle (one grouped query for the whole list).</summary>
    public static VehicleAdminListDto MapList(VehicleUnit v, IEnumerable<VehicleImage> images)
    {
        // Unsaved uploads do not count until the editor saves them; the counts are photos (the cover may be a video poster).
        var active = images.Where(x => x.State != ImageState.Deleted && !x.IsStaged).ToList();
        var cover = active.FirstOrDefault(x => x.IsCover && x.State == ImageState.Ready);
        var photos = VehicleGallery.Photos(active).ToList();
        return new(v.Id, v.PublicSlug, v.Status, v.Make, v.Model, v.Variant, v.FirstRegistrationYear, v.FirstRegistrationMonth,
            v.MileageKm, v.PowerHp, v.PriceEur, v.InternalReference, cover is null ? null : $"{Base(v)}/{cover.Id}/card",
            photos.Count, photos.Count(x => x.State == ImageState.Ready), v.UpdatedAt, v.PublishedAt);
    }

    /// <param name="pendingJobs">Images the worker still has a queued or running job for.</param>
    public static VehicleAdminDto Map(VehicleUnit v, IEnumerable<VehicleImage> images, IEnumerable<VehicleVideo> videos, IReadOnlySet<Guid>? pendingJobs = null)
    {
        var active = images.Where(x => x.State != ImageState.Deleted).ToList();
        return new(v.Id, v.PublicSlug, v.Status, v.Make, v.Model,
            v.FirstRegistrationYear, v.FirstRegistrationMonth, v.PriceEur, v.InternalReference, v.Description, v.MileageKm, v.PowerHp, v.Variant,
            v.FuelType, v.Transmission, v.BodyType, v.Drivetrain, v.ExteriorColour, v.Interior, v.History, v.Provenance,
            VehicleContent.ReadEquipment(v.EquipmentJson), VehicleContent.ReadSpecifications(v.CustomSpecificationsJson),
            // Same order as the public site (cover first), so what the admin sees is what gets published.
            VehicleGallery.InPublicOrder(active).Select(x => MapImage(v, x, pendingJobs?.Contains(x.Id) == true)).ToList(),
            videos.Where(x => x.State != VideoState.Deleted).OrderBy(x => x.CreatedAt).Select(x => new VideoAdminDto(x.Id, x.State, x.IsStaged, x.SizeBytes,
                $"/api/admin/vehicles/{v.Id}/video/{x.Id}", active.FirstOrDefault(i => i.Kind == ImageKind.VideoPoster && i.VideoId == x.Id)?.Id)).ToList(),
            v.UpdatedAt, v.PublishedAt);
    }
}
