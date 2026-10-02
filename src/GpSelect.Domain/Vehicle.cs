namespace GpSelect.Domain;

public enum VehicleStatus { Draft, ComingSoon, Available, Reserved, Sold, Archived }
public enum ImageState { PendingUpload, Processing, Ready, Failed, Deleted }
public enum ImageJobState { Queued, Processing, Failed, Complete }

public sealed class DomainException(string code, string message, string? field = null) : Exception(message)
{
    public string Code { get; } = code;
    /// <summary>camelCase request field the error refers to, when there is one.</summary>
    public string? Field { get; } = field;
}

/// <summary>Which statuses the public site may show. Listing and detail are deliberately separate.</summary>
public static class VehicleVisibility
{
    /// <summary>Shown in the public catalogue and require the publication minimum.</summary>
    public static bool IsListed(VehicleStatus status) =>
        status is VehicleStatus.ComingSoon or VehicleStatus.Available or VehicleStatus.Reserved;

    /// <summary>In the public catalogue: the listed statuses, and a sold vehicle the admin chose to keep on show.</summary>
    public static bool IsInCatalogue(VehicleStatus status, bool showWhenSold) =>
        IsListed(status) || (status == VehicleStatus.Sold && showWhenSold);

    /// <summary>A sold vehicle keeps its public URL (the site shows it as no longer available),
    /// but only if it was published at some point or is kept on show.</summary>
    public static bool HasPublicDetail(VehicleStatus status, DateTimeOffset? publishedAt, bool showWhenSold = false) =>
        IsInCatalogue(status, showWhenSold) || (status == VehicleStatus.Sold && publishedAt is not null);
}

public sealed class VehicleUnit
{
    private VehicleUnit() { }
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string PublicSlug { get; private set; } = "";
    public string? InternalReference { get; private set; }
    public VehicleStatus Status { get; private set; } = VehicleStatus.Draft;
    public string Make { get; private set; } = ""; public string Model { get; private set; } = "";
    public string? Variant { get; private set; } public int FirstRegistrationYear { get; private set; }
    public int? FirstRegistrationMonth { get; private set; } public int? MileageKm { get; private set; }
    public int? PowerHp { get; private set; }
    public string? FuelType { get; private set; } public string? Transmission { get; private set; }
    public string? BodyType { get; private set; } public string? Drivetrain { get; private set; }
    public string? ExteriorColour { get; private set; }
    public string? Interior { get; private set; } public string? Vin { get; private set; }
    public string? History { get; private set; } public string? Provenance { get; private set; }
    public string? Description { get; private set; } public string? InternalNotes { get; private set; }
    public decimal? PriceEur { get; private set; } public decimal? PurchaseCostEur { get; private set; }
    public string? EquipmentJson { get; private set; } public string? CustomSpecificationsJson { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; private set; }
    /// <summary>Only matters while Sold: keeps the vehicle in the public catalogue, marked as sold.</summary>
    public bool ShowWhenSold { get; private set; }

    public static VehicleUnit Create(string make, string model, int year, int? month, string slug, string? internalReference = null)
    {
        if (string.IsNullOrWhiteSpace(slug)) throw new DomainException("slug_required", "Slug is required");
        VehicleRules.ValidateRegistration(year, month);
        return new VehicleUnit
        {
            Make = VehicleRules.RequiredText(make, VehicleRules.MakeMax, "make"),
            Model = VehicleRules.RequiredText(model, VehicleRules.ModelMax, "model"),
            FirstRegistrationYear = year,
            FirstRegistrationMonth = month,
            InternalReference = VehicleRules.ShortText(internalReference, VehicleRules.ShortTextMax, "internalReference"),
            PublicSlug = slug,
        };
    }

    /// <summary>Merge-patch: absent properties keep their value, present null or empty clears,
    /// present values are validated. Every change is validated before anything is assigned.</summary>
    public void Apply(VehicleChanges c)
    {
        if (Status == VehicleStatus.Archived) throw new DomainException("archived", "Restore the vehicle before editing it");

        var make = c.Make.HasValue ? VehicleRules.RequiredText(c.Make.Value, VehicleRules.MakeMax, "make") : Make;
        var model = c.Model.HasValue ? VehicleRules.RequiredText(c.Model.Value, VehicleRules.ModelMax, "model") : Model;
        var year = FirstRegistrationYear;
        if (c.FirstRegistrationYear.HasValue)
            year = c.FirstRegistrationYear.Value ?? throw new DomainException("required", "First registration year is required", "firstRegistrationYear");
        var month = c.FirstRegistrationMonth.HasValue ? c.FirstRegistrationMonth.Value : FirstRegistrationMonth;
        VehicleRules.ValidateRegistration(year, month);

        var mileage = Pick(c.MileageKm, MileageKm, v => VehicleRules.Range(v, 0, VehicleRules.MileageMax, "mileageKm"));
        var power = Pick(c.PowerHp, PowerHp, v => VehicleRules.Range(v, 1, VehicleRules.PowerMax, "powerHp"));
        var price = Pick(c.PriceEur, PriceEur, v => VehicleRules.Price(v));
        var variant = Pick(c.Variant, Variant, v => VehicleRules.ShortText(v, VehicleRules.VariantMax, "variant"));
        var fuel = Pick(c.FuelType, FuelType, v => VehicleRules.ShortText(v, VehicleRules.ShortTextMax, "fuelType"));
        var transmission = Pick(c.Transmission, Transmission, v => VehicleRules.ShortText(v, VehicleRules.ShortTextMax, "transmission"));
        var body = Pick(c.BodyType, BodyType, v => VehicleRules.ShortText(v, VehicleRules.ShortTextMax, "bodyType"));
        var drivetrain = Pick(c.Drivetrain, Drivetrain, v => VehicleRules.ShortText(v, VehicleRules.ShortTextMax, "drivetrain"));
        var exterior = Pick(c.ExteriorColour, ExteriorColour, v => VehicleRules.ShortText(v, VehicleRules.ShortTextMax, "exteriorColour"));
        var interior = Pick(c.Interior, Interior, v => VehicleRules.ShortText(v, VehicleRules.ShortTextMax, "interior"));
        var reference = Pick(c.InternalReference, InternalReference, v => VehicleRules.ShortText(v, VehicleRules.ShortTextMax, "internalReference"));
        var provenance = Pick(c.Provenance, Provenance, v => VehicleRules.LongText(v, VehicleRules.ProvenanceMax, "provenance"));
        var history = Pick(c.History, History, v => VehicleRules.LongText(v, VehicleRules.HistoryMax, "history"));
        var description = Pick(c.Description, Description, v => VehicleRules.LongText(v, VehicleRules.DescriptionMax, "description"));
        var equipment = c.Equipment.HasValue ? VehicleContent.WriteEquipment(c.Equipment.Value) : EquipmentJson;
        var specifications = c.CustomSpecifications.HasValue ? VehicleContent.WriteSpecifications(c.CustomSpecifications.Value) : CustomSpecificationsJson;

        if (VehicleVisibility.IsListed(Status)) VehicleRules.EnsurePublicPrice(price);

        Make = make; Model = model; FirstRegistrationYear = year; FirstRegistrationMonth = month;
        MileageKm = mileage; PowerHp = power; PriceEur = price; Variant = variant; FuelType = fuel;
        Transmission = transmission; BodyType = body; Drivetrain = drivetrain; ExteriorColour = exterior;
        Interior = interior; InternalReference = reference; Provenance = provenance; History = history;
        Description = description; EquipmentJson = equipment; CustomSpecificationsJson = specifications;
        Touch();
    }

    /// <summary>Operational status. Archived is only reachable through <see cref="Archive"/> and left through
    /// <see cref="Restore"/>. Entering a listed status requires the publication minimum; a sold vehicle kept on
    /// show needs its photograph (its price is never shown). <paramref name="showWhenSold"/> null keeps the choice.</summary>
    public void ChangeStatus(VehicleStatus next, IReadOnlyCollection<VehicleImage> images, bool? showWhenSold = null)
    {
        if (Status == VehicleStatus.Archived) throw new DomainException("archived", "Restore the vehicle before changing its status");
        if (next == VehicleStatus.Archived) throw new DomainException("invalid_transition", "Use archive to archive a vehicle", "status");
        var show = showWhenSold ?? ShowWhenSold;
        if (VehicleVisibility.IsListed(next) || (next == VehicleStatus.Sold && show))
        {
            if (string.IsNullOrWhiteSpace(Make) || string.IsNullOrWhiteSpace(Model) || FirstRegistrationYear < VehicleRules.FirstYear)
                throw new DomainException("incomplete", "Minimum vehicle fields are missing");
            var published = images.Where(x => !x.IsStaged).ToList();
            if (published.Count(x => x.State == ImageState.Ready) == 0 || published.Count(x => x.IsCover && x.State == ImageState.Ready) != 1)
                throw new DomainException("images_required", "A ready cover and image is required");
        }
        if (VehicleVisibility.IsListed(next))
        {
            VehicleRules.EnsurePublicPrice(PriceEur);
            PublishedAt ??= DateTimeOffset.UtcNow;
        }
        Status = next;
        ShowWhenSold = show;
        Touch();
    }

    /// <summary>Kept for the existing publish endpoint: publishing is a change to ComingSoon or Available.</summary>
    public void Publish(IReadOnlyCollection<VehicleImage> images, VehicleStatus target = VehicleStatus.ComingSoon)
    {
        if (Status == VehicleStatus.Archived) throw new DomainException("archived", "Restore the vehicle before publishing it");
        if (target is not (VehicleStatus.ComingSoon or VehicleStatus.Available))
            throw new DomainException("invalid_transition", "Invalid publication status", "target");
        ChangeStatus(target, images);
    }

    /// <summary>Archiving hides the vehicle from the site and from the working list until it is restored.</summary>
    public void Archive() { if (Status == VehicleStatus.Archived) return; Status = VehicleStatus.Archived; Touch(); }

    /// <summary>A restored vehicle comes back as a draft: nothing becomes public until it is published again.</summary>
    public void Restore() { if (Status != VehicleStatus.Archived) return; Status = VehicleStatus.Draft; Touch(); }

    private static T Pick<T>(Optional<T> change, T current, Func<T, T> validate) => change.HasValue ? validate(change.Value) : current;
    private void Touch() => UpdatedAt = DateTimeOffset.UtcNow;
}

public sealed class VehicleImage
{
    private VehicleImage() { }
    public Guid Id { get; private set; } = Guid.NewGuid(); public Guid VehicleUnitId { get; private set; }
    public string OriginalKey { get; private set; } = ""; public string? CardKey { get; private set; } public string? DetailKey { get; private set; }
    public string MimeType { get; private set; } = ""; public long SizeBytes { get; private set; } public int SortOrder { get; private set; }
    public bool IsCover { get; private set; } public ImageState State { get; private set; } = ImageState.PendingUpload; public string? FailureReason { get; private set; }
    /// <summary>Uploaded from the editor but not saved yet: processed in the background, never public and never the cover.</summary>
    public bool IsStaged { get; private set; }
    public static VehicleImage Create(Guid vehicle, string key, string mime, long size, bool staged = false) => new() { VehicleUnitId = vehicle, OriginalKey = key, MimeType = mime, SizeBytes = size, IsStaged = staged };
    /// <summary>The editor saved: the photograph becomes part of the vehicle.</summary>
    public void Publish() => IsStaged = false;
    public void StartProcessing() { if (State != ImageState.PendingUpload && State != ImageState.Failed) throw new DomainException("invalid_image_state", "Image is not uploadable"); State = ImageState.Processing; FailureReason = null; }
    public void Ready(string card, string detail) { if (State == ImageState.Deleted) return; CardKey = card; DetailKey = detail; State = ImageState.Ready; FailureReason = null; }
    public void Fail(string reason) { if (State == ImageState.Deleted) return; State = ImageState.Failed; FailureReason = reason; }
    public void SetCover(bool cover) => IsCover = cover;
    public void Order(int order) => SortOrder = order;
    public void Delete() => State = ImageState.Deleted;
}

/// <summary>The cover is the principal image and always the first ready image in the admin order:
/// making an image the cover moves it to the front, and moving an image to the front makes it the cover.
/// Staged images (uploaded but not saved) take part in the order but never in the cover.</summary>
public static class VehicleGallery
{
    public static IEnumerable<VehicleImage> InPublicOrder(IEnumerable<VehicleImage> images) =>
        images.OrderByDescending(x => x.IsCover).ThenBy(x => x.SortOrder).ThenBy(x => x.Id);

    /// <summary>Gives the cover to the first ready image. Returns the new cover when it changed, so the caller can
    /// persist the old cover's removal first (one active cover per vehicle is a unique index).</summary>
    public static VehicleImage? EnsureCover(IEnumerable<VehicleImage> images)
    {
        var active = images.Where(x => x.State != ImageState.Deleted).ToList();
        var first = active.Where(x => x.State == ImageState.Ready && !x.IsStaged).OrderBy(x => x.SortOrder).ThenBy(x => x.Id).FirstOrDefault();
        if (first is not null && first.IsCover && active.Count(x => x.IsCover) == 1) return null;
        foreach (var stale in active.Where(x => x.IsCover && x != first)) stale.SetCover(false);
        first?.SetCover(true);
        return first;
    }

    /// <summary>Applies a new order (every active image, once) and gives the cover to the first ready image.</summary>
    public static VehicleImage? Reorder(IReadOnlyList<VehicleImage> images, IReadOnlyList<Guid> order)
    {
        var active = images.Where(x => x.State != ImageState.Deleted).ToList();
        if (order.Count != active.Count || order.Distinct().Count() != order.Count || active.Any(x => !order.Contains(x.Id)))
            throw new DomainException("invalid_order", "The order must list every active image once");
        for (var i = 0; i < order.Count; i++) active.Single(x => x.Id == order[i]).Order(i);
        return EnsureCover(active);
    }

    /// <summary>Makes a ready image the cover by moving it to the front; the rest keep their relative order.</summary>
    public static VehicleImage? MakeCover(IReadOnlyList<VehicleImage> images, VehicleImage cover)
    {
        if (cover.State != ImageState.Ready || cover.IsStaged) throw new DomainException("image_not_ready", "Only a ready, saved image can be the cover");
        var rest = images.Where(x => x.State != ImageState.Deleted && x != cover).OrderBy(x => x.SortOrder).ThenBy(x => x.Id).Select(x => x.Id);
        return Reorder(images, [cover.Id, .. rest]);
    }

    /// <summary>Removes an image, promoting the next ready image when the cover goes. A listed vehicle
    /// cannot lose its last ready image: it would stay public without a photograph.</summary>
    public static VehicleImage? Remove(VehicleUnit vehicle, VehicleImage image, IReadOnlyCollection<VehicleImage> images)
    {
        var otherReady = images.Count(x => x.Id != image.Id && x.State == ImageState.Ready && !x.IsStaged);
        if (VehicleVisibility.IsInCatalogue(vehicle.Status, vehicle.ShowWhenSold) && image.State == ImageState.Ready && !image.IsStaged && otherReady == 0)
            throw new DomainException("last_public_image", "A listed vehicle needs at least one ready image; withdraw it first");
        image.SetCover(false);
        image.Delete();
        return EnsureCover(images);
    }
}

public sealed class ImageProcessingJob { private ImageProcessingJob() { } public Guid Id { get; private set; } = Guid.NewGuid(); public Guid ImageId { get; private set; } public ImageJobState State { get; private set; } = ImageJobState.Queued; public int Attempts { get; private set; } public DateTimeOffset NextAttemptAt { get; private set; } = DateTimeOffset.UtcNow; public DateTimeOffset? ClaimedAt { get; private set; } public string? Error { get; private set; } public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow; public static ImageProcessingJob Create(Guid image) => new() { ImageId = image }; public bool CanRetry() => Attempts < 5; public void Claim() { State = ImageJobState.Processing; Attempts++; ClaimedAt = DateTimeOffset.UtcNow; } public void Retry(string error) { Error = error; State = CanRetry() ? ImageJobState.Queued : ImageJobState.Failed; ClaimedAt = null; NextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(Math.Min(300, Math.Pow(2, Attempts) * 5)); } public void Cancel() { State = ImageJobState.Failed; ClaimedAt = null; Error = "Cancelled"; } public void Complete() { State = ImageJobState.Complete; ClaimedAt = null; Error = null; } }
