using System.ComponentModel.DataAnnotations;
using GpSelect.Domain;
namespace GpSelect.Application;

public sealed record CreateVehicleRequest(string Make, string Model, int FirstRegistrationYear, int? FirstRegistrationMonth, string? InternalReference);
/// <summary>PATCH body with merge-patch semantics: send only the properties that change.</summary>
public sealed record UpdateVehicleRequest : VehicleChanges;
/// <summary>Status is required (a missing enum would otherwise read as Draft). ShowWhenSold null keeps the
/// current choice; it only has an effect while the vehicle is Sold.</summary>
public sealed record StatusChangeRequest([Required] VehicleStatus? Status, bool? ShowWhenSold = null);
/// <summary>Final order of every saved photo the vehicle keeps plus the staged ones to publish, and the photos to
/// remove. Staged photos not in the order stay staged; without an order no staged photo is published.</summary>
public sealed record GalleryChanges(IReadOnlyList<Guid>? Order, IReadOnlyList<Guid>? Removed);
/// <summary>Everything the editor changed, saved at once. Each part is optional; Changes has merge-patch semantics.</summary>
public sealed record SaveVehicleRequest(UpdateVehicleRequest? Changes, GalleryChanges? Gallery, StatusChangeRequest? Status);
public interface ISlugGenerator { string Generate(string make, string model); }
/// <summary>Public contact form. Exactly the form's fields; all nullable so the domain answers with a per-field problem.</summary>
public sealed record CreateEnquiryRequest(EnquiryIntent? Intent, string? Name, string? Email, string? Phone, string? Vehicle, string? Message);

public sealed record VehicleAdminListDto(Guid Id, string Slug, VehicleStatus Status, string Make, string Model, string? Variant, int Year, int? Month,
    int? MileageKm, int? PowerHp, decimal? PriceEur, string? InternalReference, string? CoverCardUrl, int ImageCount, int ReadyImageCount,
    DateTimeOffset UpdatedAt, DateTimeOffset? PublishedAt, bool ShowWhenSold);
public sealed record VehicleAdminDto(Guid Id, string Slug, VehicleStatus Status, string Make, string Model, int Year, int? Month, decimal? PriceEur,
    string? InternalReference, string? Description, int? MileageKm, int? PowerHp, string? Variant, string? FuelType, string? Transmission,
    string? BodyType, string? Drivetrain, string? ExteriorColour, string? Interior, string? History, string? Provenance,
    IReadOnlyList<string> Equipment, IReadOnlyList<VehicleSpecification> CustomSpecifications, IReadOnlyList<ImageAdminDto> Images,
    DateTimeOffset UpdatedAt, DateTimeOffset? PublishedAt, bool ShowWhenSold);
public sealed record ImageAdminDto(Guid Id, ImageState State, string? CardUrl, string? DetailUrl, bool IsCover, int SortOrder, string? FailureReason, bool IsStaged);

// Public contracts. Internal fields (InternalReference, Vin, InternalNotes, PurchaseCostEur) never appear here.
public sealed record VehiclePublicCardDto(string Slug, string Make, string Model, string? Variant, int Year, int? Month, decimal? PriceEur,
    int? MileageKm, int? PowerHp, string? FuelType, string? Transmission, string? BodyType, VehicleStatus Status, IReadOnlyList<string> Images);
public sealed record VehiclePublicDto(string Slug, string Make, string Model, string? Variant, int Year, int? Month, decimal? PriceEur,
    int? MileageKm, int? PowerHp, string? FuelType, string? Transmission, string? BodyType, string? Drivetrain, string? ExteriorColour,
    string? Interior, string? Description, string? History, string? Provenance, IReadOnlyList<string> Equipment,
    IReadOnlyList<VehicleSpecification> CustomSpecifications, VehicleStatus Status, IReadOnlyList<string> Images);

public static class PublicMapping
{
    private static string Base(VehicleUnit v) => $"/api/public/vehicles/{Uri.EscapeDataString(v.PublicSlug)}/images";

    public static VehiclePublicDto Map(VehicleUnit v, IEnumerable<VehicleImage> images) => new(
        v.PublicSlug, v.Make, v.Model, v.Variant, v.FirstRegistrationYear, v.FirstRegistrationMonth, v.PriceEur,
        v.MileageKm, v.PowerHp, v.FuelType, v.Transmission, v.BodyType, v.Drivetrain, v.ExteriorColour,
        v.Interior, v.Description, v.History, v.Provenance, VehicleContent.ReadEquipment(v.EquipmentJson),
        VehicleContent.ReadSpecifications(v.CustomSpecificationsJson), v.Status,
        VehicleGallery.InPublicOrder(images.Where(x => x.State == ImageState.Ready && !x.IsStaged && x.DetailKey is not null))
            .Select(x => $"{Base(v)}/{x.Id}/detail").ToList());

    public static VehiclePublicCardDto MapCard(VehicleUnit v, IEnumerable<VehicleImage> images) => new(
        v.PublicSlug, v.Make, v.Model, v.Variant, v.FirstRegistrationYear, v.FirstRegistrationMonth, v.PriceEur,
        v.MileageKm, v.PowerHp, v.FuelType, v.Transmission, v.BodyType, v.Status,
        VehicleGallery.InPublicOrder(images.Where(x => x.State == ImageState.Ready && !x.IsStaged && x.CardKey is not null))
            .Select(x => $"{Base(v)}/{x.Id}/card").ToList());
}

public static class AdminMapping
{
    private static string Base(VehicleUnit v) => $"/api/admin/vehicles/{v.Id}/images";

    public static ImageAdminDto MapImage(VehicleUnit v, VehicleImage x) => new(x.Id, x.State,
        x.State == ImageState.Ready ? $"{Base(v)}/{x.Id}/card" : null,
        x.State == ImageState.Ready ? $"{Base(v)}/{x.Id}/detail" : null, x.IsCover, x.SortOrder, x.FailureReason, x.IsStaged);

    /// <summary>Images must already be loaded for this vehicle (one grouped query for the whole list).</summary>
    public static VehicleAdminListDto MapList(VehicleUnit v, IEnumerable<VehicleImage> images)
    {
        // Unsaved uploads do not count until the editor saves them.
        var active = images.Where(x => x.State != ImageState.Deleted && !x.IsStaged).ToList();
        var cover = active.FirstOrDefault(x => x.IsCover && x.State == ImageState.Ready);
        return new(v.Id, v.PublicSlug, v.Status, v.Make, v.Model, v.Variant, v.FirstRegistrationYear, v.FirstRegistrationMonth,
            v.MileageKm, v.PowerHp, v.PriceEur, v.InternalReference, cover is null ? null : $"{Base(v)}/{cover.Id}/card",
            active.Count, active.Count(x => x.State == ImageState.Ready), v.UpdatedAt, v.PublishedAt, v.ShowWhenSold);
    }

    public static VehicleAdminDto Map(VehicleUnit v, IEnumerable<VehicleImage> images) => new(v.Id, v.PublicSlug, v.Status, v.Make, v.Model,
        v.FirstRegistrationYear, v.FirstRegistrationMonth, v.PriceEur, v.InternalReference, v.Description, v.MileageKm, v.PowerHp, v.Variant,
        v.FuelType, v.Transmission, v.BodyType, v.Drivetrain, v.ExteriorColour, v.Interior, v.History, v.Provenance,
        VehicleContent.ReadEquipment(v.EquipmentJson), VehicleContent.ReadSpecifications(v.CustomSpecificationsJson),
        // Same order as the public site (cover first), so what the admin sees is what gets published.
        VehicleGallery.InPublicOrder(images.Where(x => x.State != ImageState.Deleted)).Select(x => MapImage(v, x)).ToList(),
        v.UpdatedAt, v.PublishedAt, v.ShowWhenSold);
}
