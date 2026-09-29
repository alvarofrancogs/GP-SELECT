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

    /// <summary>A sold vehicle keeps its public URL (the site shows it as no longer available),
    /// but only if it was published at some point.</summary>
    public static bool HasPublicDetail(VehicleStatus status, DateTimeOffset? publishedAt) =>
        IsListed(status) || (status == VehicleStatus.Sold && publishedAt is not null);
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
        if (Status == VehicleStatus.Archived) throw new DomainException("archived", "Archived vehicles cannot change");

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

    /// <summary>Operational status. Archived is terminal and only reachable through <see cref="Archive"/>.
    /// Entering a listed status requires the publication minimum.</summary>
    public void ChangeStatus(VehicleStatus next, IReadOnlyCollection<VehicleImage> images)
    {
        if (Status == VehicleStatus.Archived) throw new DomainException("archived", "Archived is terminal");
        if (next == VehicleStatus.Archived) throw new DomainException("invalid_transition", "Use archive to archive a vehicle", "status");
        if (VehicleVisibility.IsListed(next))
        {
            if (string.IsNullOrWhiteSpace(Make) || string.IsNullOrWhiteSpace(Model) || FirstRegistrationYear < VehicleRules.FirstYear)
                throw new DomainException("incomplete", "Minimum vehicle fields are missing");
            if (images.Count(x => x.State == ImageState.Ready) == 0 || images.Count(x => x.IsCover && x.State == ImageState.Ready) != 1)
                throw new DomainException("images_required", "A ready cover and image is required");
            VehicleRules.EnsurePublicPrice(PriceEur);
            PublishedAt ??= DateTimeOffset.UtcNow;
        }
        Status = next;
        Touch();
    }

    /// <summary>Kept for the existing publish endpoint: publishing is a change to ComingSoon or Available.</summary>
    public void Publish(IReadOnlyCollection<VehicleImage> images, VehicleStatus target = VehicleStatus.ComingSoon)
    {
        if (Status == VehicleStatus.Archived) throw new DomainException("archived", "Archived is terminal");
        if (target is not (VehicleStatus.ComingSoon or VehicleStatus.Available))
            throw new DomainException("invalid_transition", "Invalid publication status", "target");
        ChangeStatus(target, images);
    }

    public void Archive() { if (Status == VehicleStatus.Archived) return; Status = VehicleStatus.Archived; Touch(); }

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
    public static VehicleImage Create(Guid vehicle, string key, string mime, long size) => new() { VehicleUnitId = vehicle, OriginalKey = key, MimeType = mime, SizeBytes = size };
    public void StartProcessing() { if (State != ImageState.PendingUpload && State != ImageState.Failed) throw new DomainException("invalid_image_state", "Image is not uploadable"); State = ImageState.Processing; FailureReason = null; }
    public void Ready(string card, string detail) { if (State == ImageState.Deleted) return; CardKey = card; DetailKey = detail; State = ImageState.Ready; FailureReason = null; }
    public void Fail(string reason) { if (State == ImageState.Deleted) return; State = ImageState.Failed; FailureReason = reason; }
    public void SetCover(bool cover) => IsCover = cover;
    public void Order(int order) => SortOrder = order;
    public void Delete() => State = ImageState.Deleted;
}

/// <summary>The cover is the principal image: it goes first publicly and there is always one while a ready image exists.</summary>
public static class VehicleGallery
{
    public static IEnumerable<VehicleImage> InPublicOrder(IEnumerable<VehicleImage> images) =>
        images.OrderByDescending(x => x.IsCover).ThenBy(x => x.SortOrder).ThenBy(x => x.Id);

    /// <summary>Promotes the first ready image when no ready cover exists. Returns the new cover, if any.</summary>
    public static VehicleImage? EnsureCover(IEnumerable<VehicleImage> images)
    {
        var active = images.Where(x => x.State != ImageState.Deleted).ToList();
        if (active.Any(x => x.IsCover && x.State == ImageState.Ready)) return null;
        foreach (var stale in active.Where(x => x.IsCover)) stale.SetCover(false);
        var next = active.Where(x => x.State == ImageState.Ready).OrderBy(x => x.SortOrder).ThenBy(x => x.Id).FirstOrDefault();
        next?.SetCover(true);
        return next;
    }

    /// <summary>Removes an image, promoting the next ready image when the cover goes. A listed vehicle
    /// cannot lose its last ready image: it would stay public without a photograph.</summary>
    public static void Remove(VehicleUnit vehicle, VehicleImage image, IReadOnlyCollection<VehicleImage> images)
    {
        var otherReady = images.Count(x => x.Id != image.Id && x.State == ImageState.Ready);
        if (VehicleVisibility.IsListed(vehicle.Status) && image.State == ImageState.Ready && otherReady == 0)
            throw new DomainException("last_public_image", "A listed vehicle needs at least one ready image; withdraw it first");
        image.SetCover(false);
        image.Delete();
        EnsureCover(images);
    }
}

public sealed class ImageProcessingJob { private ImageProcessingJob() { } public Guid Id { get; private set; } = Guid.NewGuid(); public Guid ImageId { get; private set; } public ImageJobState State { get; private set; } = ImageJobState.Queued; public int Attempts { get; private set; } public DateTimeOffset NextAttemptAt { get; private set; } = DateTimeOffset.UtcNow; public DateTimeOffset? ClaimedAt { get; private set; } public string? Error { get; private set; } public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow; public static ImageProcessingJob Create(Guid image) => new() { ImageId = image }; public bool CanRetry() => Attempts < 5; public void Claim() { State = ImageJobState.Processing; Attempts++; ClaimedAt = DateTimeOffset.UtcNow; } public void Retry(string error) { Error = error; State = CanRetry() ? ImageJobState.Queued : ImageJobState.Failed; ClaimedAt = null; NextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(Math.Min(300, Math.Pow(2, Attempts) * 5)); } public void Cancel() { State = ImageJobState.Failed; ClaimedAt = null; Error = "Cancelled"; } public void Complete() { State = ImageJobState.Complete; ClaimedAt = null; Error = null; } }
