using System.Text.Json;
using System.Text.Json.Serialization;
using GpSelect.Application;
using GpSelect.Domain;
using Xunit;

namespace GpSelect.Tests;

public class VehicleContractTests
{
    private static VehicleUnit NewVehicle() => VehicleUnit.Create("BMW", "M4", 2023, 6, "bmw-m4-x");

    private static VehicleImage ReadyImage(VehicleUnit v, int order, bool cover = false)
    {
        var image = VehicleImage.Create(v.Id, $"quarantine/{order}.jpg", "image/jpeg", 10);
        image.Ready($"card-{order}.jpg", $"detail-{order}.jpg");
        image.Order(order);
        image.SetCover(cover);
        return image;
    }

    private static (VehicleUnit Vehicle, List<VehicleImage> Images) ListedVehicle()
    {
        var v = NewVehicle();
        var images = new List<VehicleImage> { ReadyImage(v, 0, cover: true), ReadyImage(v, 1) };
        v.ChangeStatus(VehicleStatus.Available, images);
        return (v, images);
    }

    private static DomainException Fails(Action action) => Assert.Throws<DomainException>(action);

    // --- Creation ---------------------------------------------------------------------------

    [Theory]
    [InlineData("", "M4", "make")]
    [InlineData("   ", "M4", "make")]
    [InlineData("BMW", "", "model")]
    public void Create_requires_make_and_model(string make, string model, string field)
    {
        var e = Fails(() => VehicleUnit.Create(make, model, 2023, null, "slug"));
        Assert.Equal("required", e.Code);
        Assert.Equal(field, e.Field);
    }

    [Fact]
    public void Create_keeps_internal_reference_and_normalizes_spaces()
    {
        var v = VehicleUnit.Create("  Mercedes-AMG  ", " GLC   63 S ", 2021, 11, "slug", " REF-01 ");
        Assert.Equal("Mercedes-AMG", v.Make);
        Assert.Equal("GLC 63 S", v.Model);
        Assert.Equal("REF-01", v.InternalReference);
    }

    [Fact]
    public void Create_rejects_make_longer_than_60() =>
        Assert.Equal("too_long", Fails(() => VehicleUnit.Create(new string('a', 61), "M4", 2023, null, "slug")).Code);

    // --- Merge-patch --------------------------------------------------------------------------

    [Fact]
    public void Patch_absent_property_keeps_value()
    {
        var v = NewVehicle();
        v.Apply(new VehicleChanges { Variant = "Competition", PowerHp = 510 });
        v.Apply(new VehicleChanges { Description = "Otro dato" });
        Assert.Equal("Competition", v.Variant);
        Assert.Equal(510, v.PowerHp);
        Assert.Equal("Otro dato", v.Description);
    }

    [Fact]
    public void Patch_present_null_or_blank_clears_value()
    {
        var v = NewVehicle();
        v.Apply(new VehicleChanges { Variant = "Competition", History = "Libro de mantenimiento", PowerHp = 510 });
        v.Apply(new VehicleChanges { Variant = Optional<string?>.Of(null), History = "   ", PowerHp = Optional<int?>.Of(null) });
        Assert.Null(v.Variant);
        Assert.Null(v.History);
        Assert.Null(v.PowerHp);
    }

    [Fact]
    public void Patch_cannot_clear_make_model_or_year()
    {
        var v = NewVehicle();
        Assert.Equal("make", Fails(() => v.Apply(new VehicleChanges { Make = Optional<string?>.Of(null) })).Field);
        Assert.Equal("model", Fails(() => v.Apply(new VehicleChanges { Model = "" })).Field);
        Assert.Equal("firstRegistrationYear", Fails(() => v.Apply(new VehicleChanges { FirstRegistrationYear = Optional<int?>.Of(null) })).Field);
        Assert.Equal("BMW", v.Make);
    }

    [Fact]
    public void Patch_is_atomic_when_one_field_is_invalid()
    {
        var v = NewVehicle();
        Fails(() => v.Apply(new VehicleChanges { Variant = "Competition", PowerHp = 5000 }));
        Assert.Null(v.Variant);
    }

    [Theory]
    [InlineData("powerHp", 0)]
    [InlineData("powerHp", 2001)]
    [InlineData("mileageKm", -1)]
    [InlineData("mileageKm", 2_000_001)]
    [InlineData("firstRegistrationMonth", 13)]
    public void Patch_rejects_numbers_out_of_range(string field, int value)
    {
        var v = NewVehicle();
        var change = field switch
        {
            "powerHp" => new VehicleChanges { PowerHp = value },
            "mileageKm" => new VehicleChanges { MileageKm = value },
            _ => new VehicleChanges { FirstRegistrationMonth = value },
        };
        Assert.Equal(field, Fails(() => v.Apply(change)).Field);
    }

    [Fact]
    public void Patch_accepts_limit_values()
    {
        var v = NewVehicle();
        v.Apply(new VehicleChanges { PowerHp = 1, MileageKm = 0, PriceEur = 10_000_000m, Variant = new string('v', 80), History = new string('h', 4000), Provenance = new string('p', 300) });
        v.Apply(new VehicleChanges { PowerHp = 2000, MileageKm = 2_000_000, PriceEur = 0m });
        Assert.Equal(2000, v.PowerHp);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10_000_001)]
    public void Patch_rejects_price_out_of_range(int price) =>
        Assert.Equal("priceEur", Fails(() => NewVehicle().Apply(new VehicleChanges { PriceEur = (decimal)price })).Field);

    [Fact]
    public void Patch_rejects_texts_over_their_limit()
    {
        var v = NewVehicle();
        Assert.Equal("variant", Fails(() => v.Apply(new VehicleChanges { Variant = new string('v', 81) })).Field);
        Assert.Equal("history", Fails(() => v.Apply(new VehicleChanges { History = new string('h', 4001) })).Field);
        Assert.Equal("provenance", Fails(() => v.Apply(new VehicleChanges { Provenance = new string('p', 301) })).Field);
        Assert.Equal("description", Fails(() => v.Apply(new VehicleChanges { Description = new string('d', 10_001) })).Field);
    }

    [Fact]
    public void Long_text_keeps_line_breaks()
    {
        var v = NewVehicle();
        v.Apply(new VehicleChanges { Description = "  Línea uno\n\nLínea dos  " });
        Assert.Equal("Línea uno\n\nLínea dos", v.Description);
    }

    [Fact]
    public void Zero_price_is_a_value_but_cannot_be_listed()
    {
        var v = NewVehicle();
        v.Apply(new VehicleChanges { PriceEur = 0m });
        Assert.Equal(0m, v.PriceEur);
        var images = new List<VehicleImage> { ReadyImage(v, 0, cover: true) };
        Assert.Equal("price_zero", Fails(() => v.ChangeStatus(VehicleStatus.Available, images)).Code);

        var (listed, _) = ListedVehicle();
        Assert.Equal("price_zero", Fails(() => listed.Apply(new VehicleChanges { PriceEur = 0m })).Code);
        listed.Apply(new VehicleChanges { PriceEur = Optional<decimal?>.Of(null) });
        Assert.Null(listed.PriceEur);
    }

    [Fact]
    public void Archived_vehicle_cannot_be_patched()
    {
        var v = NewVehicle();
        v.Archive();
        Assert.Equal("archived", Fails(() => v.Apply(new VehicleChanges { Variant = "x" })).Code);
    }

    // --- Equipment and specifications ---------------------------------------------------------

    [Fact]
    public void Equipment_is_trimmed_deduplicated_and_empty_entries_removed()
    {
        var v = NewVehicle();
        v.Apply(new VehicleChanges { Equipment = Optional<IReadOnlyList<string?>?>.Of(new[] { "  Head-Up   Display ", "", null, "head-up display", "Harman Kardon" }) });
        Assert.Equal(new[] { "Head-Up Display", "Harman Kardon" }, VehicleContent.ReadEquipment(v.EquipmentJson));
    }

    [Fact]
    public void Equipment_limits_and_clearing()
    {
        var v = NewVehicle();
        var tooMany = Enumerable.Range(0, 101).Select(i => (string?)$"Item {i}").ToList();
        Assert.Equal("too_many", Fails(() => v.Apply(new VehicleChanges { Equipment = Optional<IReadOnlyList<string?>?>.Of(tooMany) })).Code);
        Assert.Equal("too_long", Fails(() => v.Apply(new VehicleChanges { Equipment = Optional<IReadOnlyList<string?>?>.Of(new[] { new string('e', 121) }) })).Code);

        v.Apply(new VehicleChanges { Equipment = Optional<IReadOnlyList<string?>?>.Of(new[] { "Techo" }) });
        v.Apply(new VehicleChanges { Equipment = Optional<IReadOnlyList<string?>?>.Of(Array.Empty<string?>()) });
        Assert.Null(v.EquipmentJson);
    }

    [Fact]
    public void Specifications_need_label_and_value_and_respect_limits()
    {
        var v = NewVehicle();
        var incomplete = new[] { new VehicleSpecification("Par máximo", "650 Nm"), new VehicleSpecification("  ", "3,9 s") };
        var e = Fails(() => v.Apply(new VehicleChanges { CustomSpecifications = Optional<IReadOnlyList<VehicleSpecification>?>.Of(incomplete) }));
        Assert.Equal(("specification_incomplete", "customSpecifications[1]"), (e.Code, e.Field));

        var tooMany = Enumerable.Range(0, 51).Select(i => new VehicleSpecification($"L{i}", "V")).ToList();
        Assert.Equal("too_many", Fails(() => v.Apply(new VehicleChanges { CustomSpecifications = Optional<IReadOnlyList<VehicleSpecification>?>.Of(tooMany) })).Code);
        Assert.Equal("too_long", Fails(() => v.Apply(new VehicleChanges { CustomSpecifications = Optional<IReadOnlyList<VehicleSpecification>?>.Of(new[] { new VehicleSpecification(new string('l', 81), "V") }) })).Code);

        v.Apply(new VehicleChanges { CustomSpecifications = Optional<IReadOnlyList<VehicleSpecification>?>.Of(new[] { new VehicleSpecification(" 0–100 km/h ", "3,9 s") }) });
        Assert.Equal(new VehicleSpecification("0–100 km/h", "3,9 s"), Assert.Single(VehicleContent.ReadSpecifications(v.CustomSpecificationsJson)));
    }

    [Theory]
    [InlineData("{not json")]
    [InlineData("{\"a\":1}")]
    public void Malformed_stored_content_reads_as_empty(string json)
    {
        Assert.Empty(VehicleContent.ReadEquipment(json));
        Assert.Empty(VehicleContent.ReadSpecifications(json));
    }

    // --- Status -------------------------------------------------------------------------------

    [Fact]
    public void Listed_status_requires_ready_cover()
    {
        var v = NewVehicle();
        Assert.Equal("images_required", Fails(() => v.ChangeStatus(VehicleStatus.Available, [])).Code);
        Assert.Equal("images_required", Fails(() => v.ChangeStatus(VehicleStatus.Reserved, [ReadyImage(v, 0)])).Code);
        Assert.Equal(VehicleStatus.Draft, v.Status);
    }

    [Fact]
    public void Status_moves_between_operational_states_and_publishedAt_is_set_once()
    {
        var (v, images) = ListedVehicle();
        var firstPublication = v.PublishedAt;
        Assert.NotNull(firstPublication);

        v.ChangeStatus(VehicleStatus.Reserved, images);
        v.ChangeStatus(VehicleStatus.Sold, images);
        v.ChangeStatus(VehicleStatus.Draft, images);
        v.ChangeStatus(VehicleStatus.ComingSoon, images);
        Assert.Equal(VehicleStatus.ComingSoon, v.Status);
        Assert.Equal(firstPublication, v.PublishedAt);
    }

    [Fact]
    public void Sold_and_draft_need_no_images()
    {
        var v = NewVehicle();
        v.ChangeStatus(VehicleStatus.Sold, []);
        Assert.Equal(VehicleStatus.Sold, v.Status);
        Assert.Null(v.PublishedAt);
        Assert.False(VehicleVisibility.HasPublicDetail(v.Status, v.PublishedAt));
    }

    [Fact]
    public void Archive_is_not_a_status_change_and_stays_terminal()
    {
        var (v, images) = ListedVehicle();
        Assert.Equal("invalid_transition", Fails(() => v.ChangeStatus(VehicleStatus.Archived, images)).Code);
        v.Archive();
        Assert.Equal("archived", Fails(() => v.ChangeStatus(VehicleStatus.Draft, images)).Code);
        Assert.Equal("archived", Fails(() => v.Publish(images, VehicleStatus.Available)).Code);
    }

    [Theory]
    [InlineData(VehicleStatus.Draft, false, false)]
    [InlineData(VehicleStatus.ComingSoon, true, true)]
    [InlineData(VehicleStatus.Available, true, true)]
    [InlineData(VehicleStatus.Reserved, true, true)]
    [InlineData(VehicleStatus.Sold, false, true)]
    [InlineData(VehicleStatus.Archived, false, false)]
    public void Visibility_separates_listing_from_detail(VehicleStatus status, bool listed, bool detailWhenPublished)
    {
        Assert.Equal(listed, VehicleVisibility.IsListed(status));
        Assert.Equal(detailWhenPublished, VehicleVisibility.HasPublicDetail(status, DateTimeOffset.UtcNow));
    }

    // --- Cover --------------------------------------------------------------------------------

    [Fact]
    public void First_ready_image_becomes_cover_when_none_exists()
    {
        var v = NewVehicle();
        var pending = VehicleImage.Create(v.Id, "p.jpg", "image/jpeg", 10);
        var images = new List<VehicleImage> { ReadyImage(v, 2), ReadyImage(v, 1), pending };
        Assert.Same(images[1], VehicleGallery.EnsureCover(images));
        Assert.Null(VehicleGallery.EnsureCover(images));
        Assert.Single(images, x => x.IsCover);
    }

    [Fact]
    public void Removing_the_cover_promotes_the_next_ready_image()
    {
        var (v, images) = ListedVehicle();
        VehicleGallery.Remove(v, images[0], images);
        Assert.Equal(ImageState.Deleted, images[0].State);
        Assert.False(images[0].IsCover);
        Assert.True(images[1].IsCover);
    }

    [Fact]
    public void Listed_vehicle_cannot_lose_its_last_ready_image()
    {
        var (v, images) = ListedVehicle();
        VehicleGallery.Remove(v, images[0], images);
        Assert.Equal("last_public_image", Fails(() => VehicleGallery.Remove(v, images[1], images)).Code);

        v.ChangeStatus(VehicleStatus.Draft, images);
        VehicleGallery.Remove(v, images[1], images);
        Assert.Equal(ImageState.Deleted, images[1].State);
    }

    // --- Contracts ----------------------------------------------------------------------------

    private static readonly JsonSerializerOptions ApiJson = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(), new OptionalJsonConverterFactory() },
    };

    [Fact]
    public void Patch_body_distinguishes_absent_null_and_value()
    {
        var body = """{"variant":null,"mileageKm":28400,"equipment":["Head-Up Display"],"customSpecifications":[{"label":"Par","value":"650 Nm"}]}""";
        var request = JsonSerializer.Deserialize<UpdateVehicleRequest>(body, ApiJson)!;
        Assert.False(request.Make.HasValue);
        Assert.True(request.Variant.HasValue);
        Assert.Null(request.Variant.Value);
        Assert.Equal(28400, request.MileageKm.Value);
        Assert.Equal("Head-Up Display", Assert.Single(request.Equipment.Value!));
        Assert.Equal(new VehicleSpecification("Par", "650 Nm"), Assert.Single(request.CustomSpecifications.Value!));
    }

    [Fact]
    public void Status_request_reads_enum_names()
    {
        Assert.Equal(VehicleStatus.Reserved, JsonSerializer.Deserialize<StatusChangeRequest>("""{"status":"Reserved"}""", ApiJson)!.Status);
        Assert.Contains("\"status\":\"Available\"", JsonSerializer.Serialize(new StatusChangeRequest(VehicleStatus.Available), ApiJson));
    }

    [Theory]
    [InlineData(typeof(VehiclePublicDto))]
    [InlineData(typeof(VehiclePublicCardDto))]
    public void Public_contracts_never_expose_internal_fields(Type contract)
    {
        var names = contract.GetProperties().Select(x => x.Name).ToList();
        foreach (var internalField in new[] { "InternalReference", "Vin", "InternalNotes", "PurchaseCostEur", "Id" })
            Assert.DoesNotContain(internalField, names);
    }

    [Fact]
    public void Public_detail_puts_cover_first_and_exposes_structured_content()
    {
        var v = NewVehicle();
        v.Apply(new VehicleChanges
        {
            PowerHp = 510, Drivetrain = "Trasera", History = "Un propietario",
            Equipment = Optional<IReadOnlyList<string?>?>.Of(new[] { "Techo de carbono" }),
        });
        var cover = ReadyImage(v, 9, cover: true);
        var first = ReadyImage(v, 0);
        var dto = PublicMapping.Map(v, new[] { first, cover });
        Assert.EndsWith($"{cover.Id}/detail", dto.Images[0]);
        Assert.Equal((510, "Trasera", "Un propietario"), (dto.PowerHp!.Value, dto.Drivetrain, dto.History));
        Assert.Equal("Techo de carbono", Assert.Single(dto.Equipment));
    }

    [Fact]
    public void Admin_list_row_counts_active_images_and_links_the_cover()
    {
        var (v, images) = ListedVehicle();
        var deleted = ReadyImage(v, 5);
        deleted.Delete();
        var row = AdminMapping.MapList(v, images.Append(deleted));
        Assert.Equal((2, 2), (row.ImageCount, row.ReadyImageCount));
        Assert.EndsWith($"{images[0].Id}/card", row.CoverCardUrl);
    }
}
