using System.Globalization;
using System.Text;
using System.Text.Json;
using GpSelect.Application;
using GpSelect.Domain;

namespace GpSelect.Api;

/// <summary>Server-rendered metadata and readable content for a vehicle page. It mirrors the client's
/// <c>getVehiclePageMeta</c> and <c>renderPageHead</c> (frontend/src/lib/pageMeta.ts): change both together.</summary>
public static class VehicleSeo
{
    // The frontend build wraps each page's head metadata in these markers (frontend/build/seoPlugin.ts).
    public const string HeadStart = "<!--page-meta-->";
    public const string HeadEnd = "<!--/page-meta-->";
    public const string EmptyRoot = "<div id=\"root\"></div>";

    public const string DefaultImage = "/assets/seo/og-default.jpg";
    private const string Location = "Murcia · Clientes en España y Europa";

    public static string Identity(VehiclePublicDto v) => $"{v.Make} {v.Model} ({v.Year})";
    public static string Path(VehiclePublicDto v, string locale = "es") => $"{(locale == "en" ? "/en/vehicles" : "/vehiculos")}/{Uri.EscapeDataString(v.Slug)}";

    /// <summary>Visible price in the readable body; reserved vehicles retain their price.</summary>
    public static bool HasPublicPrice(VehiclePublicDto v) => v.Status != VehicleStatus.Sold && v.PriceEur is > 0;

    /// <summary>Fills the template; null when the template was not built with the expected markers.</summary>
    public static string? Fill(string template, string head, string body, VehiclePublicDto? data = null)
    {
        var start = template.IndexOf(HeadStart, StringComparison.Ordinal);
        var end = template.IndexOf(HeadEnd, StringComparison.Ordinal);
        var root = template.IndexOf(EmptyRoot, StringComparison.Ordinal);
        if (start < 0 || end < start || root < 0) return null;
        var script = "";
        if (data is not null)
        {
            // Escape after serialization, even if the API later uses a relaxed encoder.
            var json = JsonSerializer.Serialize(data, DataOptions)
                .Replace("<", "\\u003C").Replace(">", "\\u003E").Replace("&", "\\u0026");
            script = $"<script type=\"application/json\" id=\"vehicle-data\">{json}</script>";
        }
        return template[..(start + HeadStart.Length)] + "\n    " + head + "\n    " + template[end..root]
            + $"<div id=\"root\">{body}</div>" + script + template[(root + EmptyRoot.Length)..];
    }

    public static string Head(VehiclePublicDto v, string? siteUrl, string locale = "es")
    {
        var english = locale == "en";
        var culture = english ? English : Spanish;
        string? Translate(string? value) => english ? TranslateValue(value) : value;
        var identity = Identity(v);
        var name = string.Join(" ", new[] { v.Make, v.Model, v.Variant }.Where(x => !string.IsNullOrEmpty(x)));
        var kmText = v.MileageKm is { } mileage ? $"{mileage.ToString("#,0", culture)} km" : null;
        var facts = new List<string>();
        if (kmText is not null) facts.Add(kmText);
        if (v.PowerHp is { } hp) facts.Add($"{hp.ToString("#,0", culture)} {(english ? "hp" : "CV")}");
        if (!string.IsNullOrEmpty(v.Transmission)) facts.Add(english ? $"{Translate(v.Transmission)!.ToLower(English)} gearbox" : $"cambio {v.Transmission.ToLower(Spanish)}");
        var factList = facts.Count > 1 ? string.Join(", ", facts.Take(facts.Count - 1)) + (english ? " and " : " y ") + facts[^1] : string.Join("", facts);
        var titleIdentity = name + (v.Year != 0 ? $" ({v.Year})" : "");
        var fullTitle = $"{titleIdentity} · {kmText} · GP SELECT";
        var title = kmText is not null && fullTitle.Length <= 65 ? fullTitle : $"{titleIdentity} · GP SELECT";
        var description = english
            ? $"{(v.Status == VehicleStatus.Sold ? "Sold: " : "")}{name}{(v.Year != 0 ? $" from {v.Year}" : "")}{(facts.Count > 0 ? " with " + factList : "")}."
                + (!string.IsNullOrEmpty(v.Provenance) ? $" Origin: {Translate(v.Provenance)}." : "")
                + " Photos, specifications and direct enquiries with GP SELECT from Murcia, Spain."
            : $"{(v.Status == VehicleStatus.Sold ? "Vendido: " : "")}{name}{(v.Year != 0 ? $" de {v.Year}" : "")}{(facts.Count > 0 ? " con " + factList : "")}."
                + (!string.IsNullOrEmpty(v.Provenance) ? $" Procedencia: {v.Provenance}." : "")
                + " Fotos, especificaciones y consulta directa con GP SELECT desde Murcia.";
        var url = siteUrl is null ? null : siteUrl + Path(v, locale);
        var image = v.Images.FirstOrDefault();
        var offer = new Dictionary<string, object?>
        {
            ["@type"] = "Offer", ["price"] = v.PriceEur, ["priceCurrency"] = "EUR",
            ["availability"] = v.Status == VehicleStatus.Available ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        };
        if (url is not null) offer["url"] = url;
        var car = new Dictionary<string, object?>
        {
            ["@type"] = "Car", ["name"] = identity,
            ["brand"] = new Dictionary<string, object?> { ["@type"] = "Brand", ["name"] = v.Make }, ["model"] = v.Model,
            // The year is the first registration, not a model year.
            ["dateVehicleFirstRegistration"] = v.Year != 0 ? v.Year.ToString(CultureInfo.InvariantCulture) : null,
            ["url"] = url, ["image"] = image is null ? null : Absolute(image, siteUrl), ["description"] = english ? null : v.Description,
            ["mileageFromOdometer"] = v.MileageKm is { } km ? new Dictionary<string, object?> { ["@type"] = "QuantitativeValue", ["value"] = km, ["unitCode"] = "KMT" } : null,
            ["fuelType"] = Translate(v.FuelType), ["vehicleTransmission"] = Translate(v.Transmission), ["color"] = Translate(v.ExteriorColour),
            ["bodyType"] = Translate(v.BodyType),
            ["driveWheelConfiguration"] = v.Drivetrain switch
            {
                "Integral" => "https://schema.org/AllWheelDriveConfiguration",
                "Trasera" => "https://schema.org/RearWheelDriveConfiguration",
                "Delantera" => "https://schema.org/FrontWheelDriveConfiguration",
                _ => null,
            },
            ["vehicleEngine"] = v.PowerHp is { } power ? new Dictionary<string, object?>
            {
                ["@type"] = "EngineSpecification",
                ["enginePower"] = new Dictionary<string, object?> { ["@type"] = "QuantitativeValue", ["value"] = power, ["unitText"] = english ? "hp" : "CV" },
            } : null,
            ["offers"] = (v.Status is VehicleStatus.Available or VehicleStatus.ComingSoon) && v.PriceEur is > 0 ? offer : null,
        };
        var graph = new List<object> { car.Where(x => x.Value is not null && x.Value is not "").ToDictionary(x => x.Key, x => x.Value) };
        if (siteUrl is not null)
            graph.Add(new Dictionary<string, object?>
            {
                ["@type"] = "BreadcrumbList",
                ["itemListElement"] = new[]
                {
                    (Name: english ? "Home" : "Inicio", Url: siteUrl + (english ? "/en" : "/")),
                    (Name: english ? "Vehicles" : "Vehículos", Url: siteUrl + (english ? "/en/vehicles" : "/vehiculos")),
                    (Name: identity, Url: url!),
                }.Select((x, index) => new Dictionary<string, object?>
                {
                    ["@type"] = "ListItem", ["position"] = index + 1, ["name"] = x.Name, ["item"] = x.Url,
                }).ToArray(),
            });
        var jsonLd = new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org", ["@graph"] = graph,
        };
        return Render(
            title: title, description: description,
            robots: "index,follow", canonical: url, image: image, imageAlt: identity, siteUrl, jsonLd, locale, siteUrl is null ? null : v);
    }

    public static string NotFoundHead(string locale = "es") => Render(
        title: locale == "en" ? "Vehicle not found · GP SELECT" : "Vehículo no encontrado · GP SELECT",
        description: locale == "en" ? "This page is not available. Browse the GP SELECT catalogue or go back to the home page to see our selection of European cars."
            : "Esta página no está disponible. Consulta el catálogo de GP SELECT o vuelve al inicio para conocer nuestra selección de vehículos europeos.",
        robots: "noindex", canonical: null, image: null, imageAlt: null, siteUrl: null, jsonLd: null, locale);

    /// <summary>What a reader without JavaScript (and AI crawlers) gets: the same facts the page shows.
    /// The frontend hides it once JavaScript runs and React replaces it.</summary>
    public static string Body(VehiclePublicDto v, string locale = "es")
    {
        var english = locale == "en";
        var culture = english ? English : Spanish;
        string Text(string es, string en) => english ? en : es;
        string? Translate(string? value) => english ? TranslateValue(value) : value;
        var home = english ? "/en" : "/";
        var catalogue = english ? "/en/vehicles" : "/vehiculos";
        var contact = english ? "/en/contact" : "/contacto";
        var lang = english ? " lang=\"es\"" : "";
        var html = new StringBuilder($"<div class=\"static-content\"><header><a href=\"{home}\">GP SELECT</a></header><main>");
        html.Append($"<p><a href=\"{catalogue}\">{Text("Vehículos", "Vehicles")}</a></p>");
        html.Append($"<h1>{E($"{v.Make} {v.Model}")}</h1>");
        if (v.Variant is { Length: > 0 }) html.Append($"<p>{E(v.Variant)}</p>");
        if (v.Status == VehicleStatus.Sold) html.Append($"<p>{Text("Este vehículo ya no está disponible.", "This vehicle is no longer available.")}</p>");
        else if (HasPublicPrice(v)) html.Append($"<p>{Text("Precio", "Price")}: {E(Price(v.PriceEur!.Value, locale))}</p>");

        var specs = new (string Label, string? Value)[]
        {
            (Text("Primera matriculación", "First registration"), v.Month is >= 1 and <= 12 ? $"{v.Month:00}/{v.Year}" : v.Year.ToString(CultureInfo.InvariantCulture)),
            (Text("Kilometraje", "Mileage"), v.MileageKm is { } km ? $"{km.ToString("#,0", culture)} km" : null),
            (Text("Potencia", "Power"), v.PowerHp is { } hp ? $"{hp.ToString("#,0", culture)} {Text("CV", "hp")}" : null),
            (Text("Combustible", "Fuel"), Translate(v.FuelType)), (Text("Transmisión", "Transmission"), Translate(v.Transmission)),
            (Text("Carrocería", "Body style"), Translate(v.BodyType)), (Text("Tracción", "Drivetrain"), Translate(v.Drivetrain)),
            (Text("Color exterior", "Exterior colour"), Translate(v.ExteriorColour)), (Text("Color interior", "Interior colour"), Translate(v.Interior)),
            (Text("Procedencia", "Provenance"), Translate(v.Provenance)),
        };
        html.Append($"<section><h2>{Text("Especificaciones", "Specifications")}</h2><dl>");
        foreach (var (label, value) in specs.Where(x => !string.IsNullOrWhiteSpace(x.Value)))
            html.Append($"<dt>{E(label)}</dt><dd>{E(value!)}</dd>");
        foreach (var spec in v.CustomSpecifications.Where(x => !string.IsNullOrWhiteSpace(x.Label) && !string.IsNullOrWhiteSpace(x.Value)))
            html.Append($"<dt>{E(spec.Label!)}</dt><dd>{E(spec.Value!)}</dd>");
        html.Append("</dl></section>");
        if (v.Description is { Length: > 0 }) html.Append($"<section><h2>{Text("Descripción", "Description")}</h2><p{lang}>{E(v.Description)}</p></section>");
        if (v.History is { Length: > 0 }) html.Append($"<section><h2>{Text("Historial", "History")}</h2><p{lang}>{E(v.History)}</p></section>");
        if (v.Equipment.Count > 0) html.Append($"<section><h2>{Text("Equipamiento", "Equipment")}</h2><ul{lang}>{string.Concat(v.Equipment.Select(x => $"<li>{E(x)}</li>"))}</ul></section>");
        if (v.Status != VehicleStatus.Sold)
            // Same readable vehicle name the SPA puts in the contact form (frontend/src/pages/VehicleDetail.tsx).
            html.Append($"<p><a href=\"{contact}?vehiculo={Uri.EscapeDataString($"{v.Make} {v.Model}{(v.Variant is { Length: > 0 } ? $" {v.Variant}" : "")} ({v.Year})")}&amp;intent=vehicle\">{Text("Solicitar información", "Enquire about this car")}</a></p>");
        html.Append($"</main><footer><p>{E(english ? "Murcia · Clients in Spain and Europe" : Location)}</p><nav><ul>");
        var navigation = english
            ? new[] { ("/en", "GP SELECT"), ("/en/vehicles", "Stock"), ("/en/import", "Import"), ("/en/about", "About"), ("/en/contact", "Contact") }
            : new[] { ("/", "GP SELECT"), ("/vehiculos", "Vehículos"), ("/importacion", "Importación"), ("/nosotros", "Nosotros"), ("/contacto", "Contacto") };
        foreach (var (href, label) in navigation)
            html.Append($"<li><a href=\"{href}\">{E(label)}</a></li>");
        return html.Append("</ul></nav></footer></div>").ToString();
    }

    // Same values and normalization as en.vehicles.values and vehicleFormat.translateValue.
    public static readonly IReadOnlyDictionary<string, string> EnglishValues = new Dictionary<string, string>
    {
        ["Gasolina"] = "Petrol",
        ["Eléctrico"] = "Electric",
        ["Diésel"] = "Diesel",
        ["Híbrido"] = "Hybrid",
        ["Automático"] = "Automatic",
        ["Manual"] = "Manual",
        ["Coupé"] = "Coupé",
        ["Familiar"] = "Estate",
        ["SUV"] = "SUV",
        ["Berlina"] = "Saloon",
        ["Integral"] = "All-wheel drive",
        ["Trasera"] = "Rear-wheel drive",
        ["Alemania"] = "Germany",
        ["Bélgica"] = "Belgium",
        ["Negro"] = "Black",
        ["Blanco"] = "White",
        ["Gris"] = "Grey",
        ["Azul"] = "Blue",
        ["Cuero negro"] = "Black leather",
    };

    internal static string? TranslateValue(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        var key = EnglishValues.Keys.FirstOrDefault(candidate => Normalise(candidate) == Normalise(value));
        return key is null ? value : EnglishValues[key];
    }

    private static string Normalise(string value) => string.Concat(value.Normalize(NormalizationForm.FormD)
        .EnumerateRunes().Where(rune => Rune.GetUnicodeCategory(rune) is not
            (UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark or UnicodeCategory.EnclosingMark)))
        .Trim().ToLowerInvariant();

    private static readonly CultureInfo English = CultureInfo.GetCultureInfo("en-GB");
    private static readonly CultureInfo Spanish = CultureInfo.GetCultureInfo("es-ES");
    private static string Price(decimal value, string locale) => locale == "en"
        ? $"€{Math.Round(value, 0, MidpointRounding.AwayFromZero).ToString("#,0", English)}"
        : $"{value.ToString("#,0", Spanish)} €";
    // Same escaping as the client's escapeHtml: accented text stays readable in the source.
    internal static string E(string value) => value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
        .Replace("\"", "&quot;").Replace("'", "&#39;");
    private static string Absolute(string path, string? siteUrl) => siteUrl is null ? path : siteUrl + path;

    private static string Render(string title, string description, string robots, string? canonical, string? image, string? imageAlt,
        string? siteUrl, Dictionary<string, object?>? jsonLd, string locale, VehiclePublicDto? alternate = null)
    {
        var english = locale == "en";
        var shareImage = Absolute(image ?? DefaultImage, siteUrl);
        var shareAlt = image is null ? $"GP SELECT · {(english ? "Murcia · Clients in Spain and Europe" : Location)}" : imageAlt ?? title;
        var tags = new List<string> { $"<title data-page-meta>{E(title)}</title>" };
        void Meta(string attribute, string key, string value) => tags.Add($"<meta data-page-meta {attribute}=\"{key}\" content=\"{E(value)}\">");
        Meta("name", "description", description);
        Meta("name", "robots", robots);
        if (canonical is not null) tags.Add($"<link data-page-meta rel=\"canonical\" href=\"{E(canonical)}\">");
        if (siteUrl is not null && alternate is not null)
            foreach (var language in new[] { "es", "en", "x-default" })
                tags.Add($"<link data-page-meta rel=\"alternate\" hreflang=\"{language}\" href=\"{E(siteUrl + Path(alternate, language == "es" ? "es" : "en"))}\">");
        Meta("property", "og:type", "website");
        Meta("property", "og:title", title);
        Meta("property", "og:description", description);
        Meta("property", "og:locale", english ? "en_GB" : "es_ES");
        if (alternate is not null) Meta("property", "og:locale:alternate", english ? "es_ES" : "en_GB");
        Meta("property", "og:site_name", "GP SELECT");
        if (canonical is not null) Meta("property", "og:url", canonical);
        Meta("property", "og:image", shareImage);
        Meta("property", "og:image:alt", shareAlt);
        if (image is null)
        {
            Meta("property", "og:image:type", "image/jpeg");
            Meta("property", "og:image:width", "1200");
            Meta("property", "og:image:height", "630");
        }
        Meta("name", "twitter:card", "summary_large_image");
        Meta("name", "twitter:title", title);
        Meta("name", "twitter:description", description);
        Meta("name", "twitter:image", shareImage);
        Meta("name", "twitter:image:alt", shareAlt);
        if (jsonLd is not null)
        {
            // The default encoder escapes '<', so text from the vehicle can never close the script.
            var json = JsonSerializer.Serialize(jsonLd.Where(x => x.Value is not null).ToDictionary(x => x.Key, x => x.Value), JsonLdOptions);
            tags.Add($"<script data-page-meta type=\"application/ld+json\">{json}</script>");
        }
        return string.Join("\n    ", tags);
    }

    // The same JSON the public API returns, so the client maps it with fromPublicDetail.
    private static readonly JsonSerializerOptions DataOptions = CreateDataOptions();
    private static JsonSerializerOptions CreateDataOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        ApiJsonOptions.Configure(options);
        return options;
    }

    private static readonly JsonSerializerOptions JsonLdOptions = new() { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };
}
