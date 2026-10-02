using System.Text.Json;
using System.Text.RegularExpressions;

namespace GpSelect.Domain;

/// <summary>A property that may be absent. Absent keeps the current value; present (even null) replaces it.</summary>
public readonly struct Optional<T>
{
    private Optional(T value) { HasValue = true; Value = value; }
    public bool HasValue { get; }
    public T Value { get; }
    public static Optional<T> Of(T value) => new(value);
    public static implicit operator Optional<T>(T value) => new(value);
}

/// <summary>Editable vehicle fields as a merge-patch. Make, model and year cannot be cleared.</summary>
public record VehicleChanges
{
    public Optional<string?> Make { get; init; }
    public Optional<string?> Model { get; init; }
    public Optional<string?> Variant { get; init; }
    public Optional<int?> FirstRegistrationYear { get; init; }
    public Optional<int?> FirstRegistrationMonth { get; init; }
    public Optional<int?> MileageKm { get; init; }
    public Optional<decimal?> PriceEur { get; init; }
    public Optional<int?> PowerHp { get; init; }
    public Optional<string?> FuelType { get; init; }
    public Optional<string?> Transmission { get; init; }
    public Optional<string?> BodyType { get; init; }
    public Optional<string?> Drivetrain { get; init; }
    public Optional<string?> ExteriorColour { get; init; }
    public Optional<string?> Interior { get; init; }
    public Optional<string?> Provenance { get; init; }
    public Optional<string?> History { get; init; }
    public Optional<string?> Description { get; init; }
    public Optional<string?> InternalReference { get; init; }
    public Optional<IReadOnlyList<string?>?> Equipment { get; init; }
    public Optional<IReadOnlyList<VehicleSpecification>?> CustomSpecifications { get; init; }
}

public sealed record VehicleSpecification(string? Label, string? Value);

public static class VehicleRules
{
    public const int FirstYear = 1886;
    public const int MakeMax = 60, ModelMax = 60, VariantMax = 80, ShortTextMax = 120;
    public const int ProvenanceMax = 300, HistoryMax = 4000, DescriptionMax = 10000;
    public const int MileageMax = 2_000_000, PowerMax = 2000;
    public const decimal PriceMax = 10_000_000m;
    public const int EquipmentMaxItems = 100, EquipmentItemMax = 120;
    public const int SpecificationMaxRows = 50, SpecificationLabelMax = 80, SpecificationValueMax = 120;

    private static readonly Regex Spaces = new(@"\s+", RegexOptions.Compiled);

    public static void ValidateRegistration(int year, int? month)
    {
        if (year < FirstYear || year > DateTime.UtcNow.Year + 1) throw new DomainException("invalid_registration", "Registration year is invalid", "firstRegistrationYear");
        if (month is < 1 or > 12) throw new DomainException("invalid_registration", "Registration month is invalid", "firstRegistrationMonth");
    }

    /// <summary>One-line text: whitespace collapsed, empty becomes null.</summary>
    public static string? ShortText(string? value, int max, string field)
    {
        RejectControl(value, field);
        var clean = string.IsNullOrWhiteSpace(value) ? null : Spaces.Replace(value, " ").Trim();
        if (clean?.Length > max) throw new DomainException("too_long", $"{field} exceeds {max} characters", field);
        return clean;
    }

    public static string RequiredText(string? value, int max, string field) =>
        ShortText(value, max, field) ?? throw new DomainException("required", $"{field} is required", field);

    /// <summary>Multi-line text: line breaks kept, only trimmed; empty becomes null.</summary>
    public static string? LongText(string? value, int max, string field)
    {
        RejectControl(value, field);
        var clean = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        if (clean?.Length > max) throw new DomainException("too_long", $"{field} exceeds {max} characters", field);
        return clean;
    }

    /// <summary>Only line breaks and tabs are allowed; NUL and the rest cannot reach the database or an email.</summary>
    public static void RejectControl(string? value, string field)
    {
        if (value is null) return;
        foreach (var c in value)
            if (char.IsControl(c) && c is not ('\n' or '\r' or '\t'))
                throw new DomainException("invalid_text", $"{field} contains control characters", field);
    }

    public static int? Range(int? value, int min, int max, string field) =>
        value is null || (value >= min && value <= max) ? value : throw new DomainException("out_of_range", $"{field} must be between {min} and {max}", field);

    /// <summary>Null means "no public price" (price on request). Zero is a value, never "on request".</summary>
    public static decimal? Price(decimal? value)
    {
        if (value is null) return null;
        if (value < 0 || value > PriceMax) throw new DomainException("out_of_range", $"priceEur must be between 0 and {PriceMax}", "priceEur");
        if (decimal.Round(value.Value, 2) != value) throw new DomainException("invalid_precision", "priceEur allows at most 2 decimals", "priceEur");
        return value;
    }

    /// <summary>A listed vehicle cannot show 0 €: leave the price empty for "price on request".</summary>
    public static void EnsurePublicPrice(decimal? price)
    {
        if (price == 0) throw new DomainException("price_zero", "A listed vehicle cannot have a price of 0; leave it empty for price on request", "priceEur");
    }
}

/// <summary>Equipment and extra specifications: typed in the API, stored as JSON text in the existing columns.</summary>
public static class VehicleContent
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private sealed record StoredSpecification(string Label, string Value);

    public static string? WriteEquipment(IReadOnlyList<string?>? items)
    {
        if (items is null) return null;
        var clean = new List<string>();
        foreach (var item in items)
        {
            var text = VehicleRules.ShortText(item, VehicleRules.EquipmentItemMax, "equipment");
            if (text is not null && !clean.Contains(text, StringComparer.OrdinalIgnoreCase)) clean.Add(text);
        }
        if (clean.Count > VehicleRules.EquipmentMaxItems)
            throw new DomainException("too_many", $"equipment allows at most {VehicleRules.EquipmentMaxItems} items", "equipment");
        return clean.Count == 0 ? null : JsonSerializer.Serialize(clean, Json);
    }

    public static string? WriteSpecifications(IReadOnlyList<VehicleSpecification>? rows)
    {
        if (rows is null || rows.Count == 0) return null;
        if (rows.Count > VehicleRules.SpecificationMaxRows)
            throw new DomainException("too_many", $"customSpecifications allows at most {VehicleRules.SpecificationMaxRows} rows", "customSpecifications");
        var clean = rows.Select((row, i) =>
        {
            var field = $"customSpecifications[{i}]";
            var label = VehicleRules.ShortText(row?.Label, VehicleRules.SpecificationLabelMax, field + ".label");
            var value = VehicleRules.ShortText(row?.Value, VehicleRules.SpecificationValueMax, field + ".value");
            if (label is null || value is null) throw new DomainException("specification_incomplete", "Each specification needs a name and a value", field);
            return new StoredSpecification(label, value);
        }).ToList();
        return JsonSerializer.Serialize(clean, Json);
    }

    /// <summary>Stored rows are read defensively: malformed legacy JSON yields an empty list.</summary>
    public static IReadOnlyList<string> ReadEquipment(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return (JsonSerializer.Deserialize<List<string?>>(json, Json) ?? []).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!).ToList(); }
        catch (JsonException) { return []; }
    }

    public static IReadOnlyList<VehicleSpecification> ReadSpecifications(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return (JsonSerializer.Deserialize<List<VehicleSpecification?>>(json, Json) ?? [])
                .Where(x => !string.IsNullOrWhiteSpace(x?.Label) && !string.IsNullOrWhiteSpace(x?.Value))
                .Select(x => x!).ToList();
        }
        catch (JsonException) { return []; }
    }
}
