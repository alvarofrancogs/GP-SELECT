namespace GpSelect.Domain;

public enum VehicleStatus { Draft, ComingSoon, Available, Reserved, Sold, Archived }
public enum ImageState { PendingUpload, Processing, Ready, Failed, Deleted }
public enum ImageJobState { Queued, Processing, Failed, Complete }
public sealed class DomainException(string code, string message) : Exception(message) { public string Code { get; } = code; }
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
    public string? FuelType { get; private set; } public string? Transmission { get; private set; }
    public string? BodyType { get; private set; } public string? ExteriorColour { get; private set; }
    public string? Interior { get; private set; } public string? Vin { get; private set; }
    public string? History { get; private set; } public string? Provenance { get; private set; }
    public string? Description { get; private set; } public string? InternalNotes { get; private set; }
    public decimal? PriceEur { get; private set; } public decimal? PurchaseCostEur { get; private set; }
    public string? EquipmentJson { get; private set; } public string? CustomSpecificationsJson { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; private set; }
    public static VehicleUnit Create(string make,string model,int year,int? month,string slug) { ValidateRegistration(year,month); if(string.IsNullOrWhiteSpace(slug)) throw new DomainException("slug_required","Slug is required"); return new VehicleUnit { Make=make.Trim(),Model=model.Trim(),FirstRegistrationYear=year,FirstRegistrationMonth=month,PublicSlug=slug }; }
    public void Update(string? make,string? model,int? year,int? month,decimal? price,string? description,string? reference,int? mileage,string? variant,string? fuel,string? transmission,string? body,string? exterior,string? interior,string? history,string? provenance,string? equipment,string? specifications) { if(Status==VehicleStatus.Archived) throw new DomainException("archived","Archived vehicles cannot change"); if(year.HasValue) ValidateRegistration(year.Value,month); if(mileage is <0 or >2000000) throw new DomainException("invalid_mileage","Mileage is invalid"); if(description?.Length>10000) throw new DomainException("description_too_long","Description is too long"); Make=make?.Trim()??Make; Model=model?.Trim()??Model; if(year.HasValue) FirstRegistrationYear=year.Value; FirstRegistrationMonth=month; PriceEur=price; Description=description; InternalReference=reference; MileageKm=mileage; Variant=variant; FuelType=fuel; Transmission=transmission; BodyType=body; ExteriorColour=exterior; Interior=interior; History=history; Provenance=provenance; EquipmentJson=equipment; CustomSpecificationsJson=specifications; Touch(); }
    public void Publish(IReadOnlyCollection<VehicleImage> images,VehicleStatus target=VehicleStatus.ComingSoon) { if(Status==VehicleStatus.Archived) throw new DomainException("archived","Archived is terminal"); if(target is not (VehicleStatus.ComingSoon or VehicleStatus.Available)) throw new DomainException("invalid_transition","Invalid publication status"); if(string.IsNullOrWhiteSpace(Make)||string.IsNullOrWhiteSpace(Model)||FirstRegistrationYear<1886) throw new DomainException("incomplete","Minimum vehicle fields are missing"); if(images.Count(x=>x.State==ImageState.Ready)==0||images.Count(x=>x.IsCover&&x.State==ImageState.Ready)!=1) throw new DomainException("images_required","A ready cover and image is required"); Status=target; PublishedAt=DateTimeOffset.UtcNow; Touch(); }
     public void ChangeStatus(VehicleStatus next) { if(Status==VehicleStatus.Archived) throw new DomainException("archived","Archived is terminal"); if(next is not (VehicleStatus.ComingSoon or VehicleStatus.Available)) throw new DomainException("invalid_transition","Only ComingSoon or Available may be published through this operation"); Status=next; PublishedAt ??= DateTimeOffset.UtcNow; Touch(); }
    public void Archive(){ if(Status==VehicleStatus.Archived) return; Status=VehicleStatus.Archived; Touch(); }
    private static void ValidateRegistration(int year,int? month){ if(year<1886||year>DateTime.UtcNow.Year+1) throw new DomainException("invalid_registration","Registration year is invalid"); if(month is <1 or >12) throw new DomainException("invalid_registration","Registration month is invalid"); }
    private void Touch()=>UpdatedAt=DateTimeOffset.UtcNow;
}
 public sealed class VehicleImage { private VehicleImage(){} public Guid Id{get;private set;}=Guid.NewGuid(); public Guid VehicleUnitId{get;private set;} public string OriginalKey{get;private set;}=""; public string? CardKey{get;private set;} public string? DetailKey{get;private set;} public string MimeType{get;private set;}=""; public long SizeBytes{get;private set;} public int SortOrder{get;private set;} public bool IsCover{get;private set;} public ImageState State{get;private set;}=ImageState.PendingUpload; public string? FailureReason{get;private set;} public static VehicleImage Create(Guid vehicle,string key,string mime,long size)=>new(){VehicleUnitId=vehicle,OriginalKey=key,MimeType=mime,SizeBytes=size}; public void StartProcessing(){if(State!=ImageState.PendingUpload&&State!=ImageState.Failed)throw new DomainException("invalid_image_state","Image is not uploadable");State=ImageState.Processing;FailureReason=null;} public void Ready(string card,string detail){if(State==ImageState.Deleted)return;CardKey=card;DetailKey=detail;State=ImageState.Ready;FailureReason=null;} public void Fail(string reason){if(State==ImageState.Deleted)return;State=ImageState.Failed;FailureReason=reason;} public void SetCover(bool cover)=>IsCover=cover; public void Order(int order)=>SortOrder=order; public void Delete()=>State=ImageState.Deleted; }
 public sealed class ImageProcessingJob { private ImageProcessingJob(){} public Guid Id{get;private set;}=Guid.NewGuid(); public Guid ImageId{get;private set;} public ImageJobState State{get;private set;}=ImageJobState.Queued; public int Attempts{get;private set;} public DateTimeOffset NextAttemptAt{get;private set;}=DateTimeOffset.UtcNow; public DateTimeOffset? ClaimedAt{get;private set;} public string? Error{get;private set;} public DateTimeOffset CreatedAt{get;private set;}=DateTimeOffset.UtcNow; public static ImageProcessingJob Create(Guid image)=>new(){ImageId=image}; public bool CanRetry()=>Attempts<5; public void Claim(){State=ImageJobState.Processing;Attempts++;ClaimedAt=DateTimeOffset.UtcNow;} public void Retry(string error){Error=error;State=CanRetry()?ImageJobState.Queued:ImageJobState.Failed;ClaimedAt=null;NextAttemptAt=DateTimeOffset.UtcNow.AddSeconds(Math.Min(300,Math.Pow(2,Attempts)*5));} public void Cancel(){State=ImageJobState.Failed;ClaimedAt=null;Error="Cancelled";} public void Complete(){State=ImageJobState.Complete;ClaimedAt=null;Error=null;} }


