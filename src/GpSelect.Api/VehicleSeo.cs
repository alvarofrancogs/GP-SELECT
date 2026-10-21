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
    private const string SpanishLocation = "Murcia · Clientes en toda Europa";
    private const string EnglishLocation = "Murcia, Spain · Clients across Europe";
    private const string SpanishDefaultImageAlt = "GP SELECT · Murcia · Clientes en España y Europa";
    private const string EnglishDefaultImageAlt = "GP SELECT · Murcia · Clients in Spain and Europe";

    public static string Identity(VehiclePublicDto v) => $"{v.Make} {v.Model} ({v.Year})";
    public static string CataloguePath(bool english = false) => english ? "/en/vehicles" : "/vehiculos";
    public static string Path(VehiclePublicDto v, bool english = false) => $"{CataloguePath(english)}/{Uri.EscapeDataString(v.Slug)}";

    /// <summary>Visible price in the readable body; reserved vehicles retain their price.</summary>
    public static bool HasPublicPrice(VehiclePublicDto v) => v.Status != VehicleStatus.Sold && v.PriceEur is > 0;

    /// <summary>Fills the template; null when the template was not built with the expected markers.</summary>
    public static string? Fill(string template, string head, string body, VehiclePublicDto? data = null)
    {
        var start = template.IndexOf(HeadStart, StringComparison.Ordinal);
        var end = template.IndexOf(HeadEnd, StringComparison.Ordinal);
        var root = template.IndexOf(EmptyRoot, StringComparison.Ordinal);
        if (start < 0 || end < start || root < 0) return null;
        var script = data is null ? "" : DataScript("vehicle-data", data);
        return template[..(start + HeadStart.Length)] + "\n    " + head + "\n    " + template[end..root]
            + $"<div id=\"root\">{body}</div>" + script + template[(root + EmptyRoot.Length)..];
    }

    /// <summary>The API's own JSON for the client to start from, safe inside the HTML.</summary>
    public static string DataScript<T>(string id, T data)
    {
        // Escape after serialization, even if the API later uses a relaxed encoder.
        var json = JsonSerializer.Serialize(data, DataOptions)
            .Replace("<", "\\u003C").Replace(">", "\\u003E").Replace("&", "\\u0026");
        return $"<script type=\"application/json\" id=\"{id}\">{json}</script>";
    }

    public static string Head(VehiclePublicDto v, string? siteUrl, bool english = false)
    {
        var culture = english ? English : Spanish;
        var identity = Identity(v);
        var name = string.Join(" ", new[] { v.Make, v.Model, v.Variant }.Where(x => !string.IsNullOrEmpty(x)));
        var kmText = v.MileageKm is { } mileage ? $"{mileage.ToString("#,0", culture)} km" : null;
        var facts = new List<string>();
        if (kmText is not null) facts.Add(kmText);
        if (v.PowerHp is { } hp) facts.Add($"{hp.ToString("#,0", culture)} {(english ? "hp" : "CV")}");
        if (!string.IsNullOrEmpty(v.Transmission)) facts.Add(english ? $"{Translate(v.Transmission, true)!.ToLower(English)} gearbox" : $"cambio {v.Transmission.ToLower(Spanish)}");
        var factList = facts.Count > 1 ? string.Join(", ", facts.Take(facts.Count - 1)) + (english ? " and " : " y ") + facts[^1] : string.Join("", facts);
        var titleIdentity = name + (v.Year != 0 ? $" ({v.Year})" : "");
        var fullTitle = $"{titleIdentity} · {kmText} · GP SELECT";
        // A sold vehicle says so in the search result itself, in place of its mileage.
        var title = v.Status == VehicleStatus.Sold ? $"{titleIdentity} · {(english ? "Sold" : "Vendido")} · GP SELECT"
            : kmText is not null && fullTitle.Length <= 65 ? fullTitle : $"{titleIdentity} · GP SELECT";
        var description = english
            ? $"{(v.Status == VehicleStatus.Sold ? "Sold: " : "")}{name}{(v.Year != 0 ? $" from {v.Year}" : "")}{(facts.Count > 0 ? " with " + factList : "")}. Photos, specifications and direct enquiries with GP SELECT."
            : $"{(v.Status == VehicleStatus.Sold ? "Vendido: " : "")}{name}{(v.Year != 0 ? $" de {v.Year}" : "")}{(facts.Count > 0 ? " con " + factList : "")}."
            + (!string.IsNullOrEmpty(v.Provenance) ? $" Procedencia: {v.Provenance}." : "")
            + " Fotos, especificaciones y consulta directa con GP SELECT desde Murcia.";
        var url = siteUrl is null ? null : siteUrl + Path(v, english);
        var image = v.Images.FirstOrDefault();
        // The published amount includes service fees and costs. The seller depends on the transaction
        // (the original seller or GP SELECT), so the Offer names none.
        var offer = new Dictionary<string, object?>
        {
            ["@type"] = "Offer", ["price"] = v.PriceEur, ["priceCurrency"] = "EUR",
            ["description"] = english ? "Total price including service fees and costs." : "Precio total con honorarios del servicio y gastos incluidos.",
            ["availability"] = v.Status == VehicleStatus.Available ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        };
        if (url is not null) offer["url"] = url;
        var car = new Dictionary<string, object?>
        {
            ["@type"] = "Car", ["name"] = identity,
            ["brand"] = new Dictionary<string, object?> { ["@type"] = "Brand", ["name"] = v.Make }, ["model"] = v.Model,
            // The year is the first registration, not a model year.
            ["dateVehicleFirstRegistration"] = v.Year != 0 ? v.Year.ToString(CultureInfo.InvariantCulture) : null,
            ["url"] = url, ["image"] = image is null ? null : Absolute(image, siteUrl), ["description"] = v.Description,
            ["mileageFromOdometer"] = v.MileageKm is { } km ? new Dictionary<string, object?> { ["@type"] = "QuantitativeValue", ["value"] = km, ["unitCode"] = "KMT" } : null,
            ["fuelType"] = Translate(v.FuelType, english), ["vehicleTransmission"] = Translate(v.Transmission, english), ["color"] = Translate(v.ExteriorColour, english),
            ["bodyType"] = Translate(v.BodyType, english),
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
                ["enginePower"] = new Dictionary<string, object?> { ["@type"] = "QuantitativeValue", ["value"] = power, ["unitText"] = "CV" },
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
                    (Name: english ? "Vehicles" : "Vehículos", Url: siteUrl + CataloguePath(english)),
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
            robots: v.Indexed ? "index,follow" : "noindex,follow", canonical: url, image: image, imageAlt: identity, siteUrl, jsonLd, english, v.Slug);
    }

    public static string NotFoundHead(bool english = false) => Render(
        title: english ? "Vehicle not found · GP SELECT" : "Vehículo no encontrado · GP SELECT",
        description: english ? "This page is not available. Browse the GP SELECT catalogue or go back to the home page to see our selection of European cars." : "Esta página no está disponible. Consulta el catálogo de GP SELECT o vuelve al inicio para conocer nuestra selección de vehículos europeos.",
        robots: "noindex", canonical: null, image: null, imageAlt: null, siteUrl: null, jsonLd: null, english: english);

    /// <summary>What a reader without JavaScript (and AI crawlers) gets: the same facts the page shows.
    /// The frontend hides it once JavaScript runs and React replaces it.</summary>
    public static string Body(VehiclePublicDto v, bool english = false)
    {
        var culture = english ? English : Spanish;
        var html = new StringBuilder($"<div class=\"static-content\"><header><a href=\"{(english ? "/en" : "/")}\">GP SELECT</a></header><main>");
        html.Append($"<p><a href=\"{CataloguePath(english)}\">{(english ? "Vehicles" : "Vehículos")}</a></p>");
        html.Append($"<h1>{E($"{v.Make} {v.Model}")}</h1>");
        if (v.Variant is { Length: > 0 }) html.Append($"<p>{E(v.Variant)}</p>");
        if (v.Status == VehicleStatus.Sold) html.Append(english ? "<p>This vehicle is no longer available.</p>" : "<p>Este vehículo ya no está disponible.</p>");
        else if (HasPublicPrice(v)) html.Append($"<p>{(english ? "Price" : "Precio")}: {E(Price(v.PriceEur!.Value, english))}</p>");

        var specs = new (string Label, string? Value)[]
        {
            (english ? "First registration" : "Primera matriculación", v.Month is >= 1 and <= 12 ? $"{v.Month:00}/{v.Year}" : v.Year.ToString(CultureInfo.InvariantCulture)),
            (english ? "Mileage" : "Kilometraje", v.MileageKm is { } km ? $"{km.ToString("#,0", culture)} km" : null),
            (english ? "Power" : "Potencia", v.PowerHp is { } hp ? $"{hp.ToString("#,0", culture)} {(english ? "hp" : "CV")}" : null),
            (english ? "Fuel" : "Combustible", Translate(v.FuelType, english)), (english ? "Transmission" : "Transmisión", Translate(v.Transmission, english)), (english ? "Body style" : "Carrocería", Translate(v.BodyType, english)),
            (english ? "Drivetrain" : "Tracción", Translate(v.Drivetrain, english)), (english ? "Exterior colour" : "Color exterior", Translate(v.ExteriorColour, english)), (english ? "Interior colour" : "Color interior", Translate(v.Interior, english)),
            (english ? "Provenance" : "Procedencia", Translate(v.Provenance, english)),
        };
        // The Admin writes its free text in Spanish: English pages mark it, for screen readers and search engines.
        var freeText = english ? " lang=\"es\"" : "";
        html.Append($"<section><h2>{(english ? "Specifications" : "Especificaciones")}</h2><dl>");
        foreach (var (label, value) in specs.Where(x => !string.IsNullOrWhiteSpace(x.Value)))
            html.Append($"<dt>{E(label)}</dt><dd>{E(value!)}</dd>");
        foreach (var spec in v.CustomSpecifications.Where(x => !string.IsNullOrWhiteSpace(x.Label) && !string.IsNullOrWhiteSpace(x.Value)))
            html.Append($"<dt{freeText}>{E(spec.Label!)}</dt><dd{freeText}>{E(spec.Value!)}</dd>");
        html.Append("</dl></section>");
        if (v.Description is { Length: > 0 }) html.Append($"<section><h2>{(english ? "Description" : "Descripción")}</h2><p{freeText}>{E(v.Description)}</p></section>");
        if (v.History is { Length: > 0 }) html.Append($"<section><h2>{(english ? "History" : "Historial")}</h2><p{freeText}>{E(v.History)}</p></section>");
        if (v.Equipment.Count > 0) html.Append($"<section><h2>{(english ? "Equipment" : "Equipamiento")}</h2><ul{freeText}>{string.Concat(v.Equipment.Select(x => $"<li>{E(x)}</li>"))}</ul></section>");
        if (v.Status != VehicleStatus.Sold)
            // Same readable vehicle name the SPA puts in the contact form (frontend/src/pages/VehicleDetail.tsx).
            html.Append($"<p><a href=\"{(english ? "/en/contact" : "/contacto")}?vehiculo={Uri.EscapeDataString($"{v.Make} {v.Model}{(v.Variant is { Length: > 0 } ? $" {v.Variant}" : "")} ({v.Year})")}&amp;intent=vehicle\">{(english ? "Enquire about this car" : "Solicitar información")}</a></p>");
        html.Append($"</main><footer><p>{E(english ? EnglishLocation : SpanishLocation)}</p><nav><ul>");
        var navigation = english
            ? new[] { ("/en", "GP SELECT"), ("/en/vehicles", "Vehicles"), ("/en/import", "Import"), ("/en/about", "About"), ("/en/contact", "Contact") }
            : new[] { ("/", "GP SELECT"), ("/vehiculos", "Vehículos"), ("/importacion", "Importación"), ("/nosotros", "Nosotros"), ("/contacto", "Contacto") };
        foreach (var (href, label) in navigation)
            html.Append($"<li><a href=\"{href}\">{E(label)}</a></li>");
        return html.Append("</ul></nav></footer></div>").ToString();
    }

    private static readonly CultureInfo Spanish = CultureInfo.GetCultureInfo("es-ES");
    private static readonly CultureInfo English = CultureInfo.GetCultureInfo("en-GB");
    private static string Price(decimal value, bool english) => english ? $"€{value.ToString("#,0", English)}" : $"{value.ToString("#,0", Spanish)} €";
    // Same escaping as the client's escapeHtml: accented text stays readable in the source.
    internal static string E(string value) => value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
        .Replace("\"", "&quot;").Replace("'", "&#39;");
    private static string Absolute(string path, string? siteUrl) => siteUrl is null ? path : siteUrl + path;

    private static string Render(string title, string description, string robots, string? canonical, string? image, string? imageAlt,
        string? siteUrl, Dictionary<string, object?>? jsonLd, bool english = false, string? vehicleSlug = null)
    {
        var shareImage = Absolute(image ?? DefaultImage, siteUrl);
        var shareAlt = image is null ? (english ? EnglishDefaultImageAlt : SpanishDefaultImageAlt) : imageAlt ?? title;
        var tags = new List<string> { $"<title data-page-meta>{E(title)}</title>" };
        void Meta(string attribute, string key, string value) => tags.Add($"<meta data-page-meta {attribute}=\"{key}\" content=\"{E(value)}\">");
        Meta("name", "description", description);
        Meta("name", "robots", robots);
        if (canonical is not null) tags.Add($"<link data-page-meta rel=\"canonical\" href=\"{E(canonical)}\">");
        if (siteUrl is not null && vehicleSlug is not null)
        {
            var slug = Uri.EscapeDataString(vehicleSlug);
            foreach (var (language, path) in new[] { ("es", $"/vehiculos/{slug}"), ("en", $"/en/vehicles/{slug}"), ("x-default", $"/en/vehicles/{slug}") })
                tags.Add($"<link data-page-meta rel=\"alternate\" hreflang=\"{language}\" href=\"{E(siteUrl + path)}\">");
        }
        Meta("property", "og:type", "website");
        Meta("property", "og:title", title);
        Meta("property", "og:description", description);
        Meta("property", "og:locale", english ? "en_GB" : "es_ES");
        if (vehicleSlug is not null) Meta("property", "og:locale:alternate", english ? "es_ES" : "en_GB");
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

    // Same known values as frontend/src/i18n/en.ts; both are checked against tests/fixtures/vehicle-values-en.json.
    // Unknown/free text stays as supplied by the author.
    internal static readonly Dictionary<string, string> EnglishValues = new()
    {
        ["Gasolina"] = "Petrol",
        ["Eléctrico"] = "Electric",
        ["Diésel"] = "Diesel",
        ["Híbrido"] = "Hybrid",
        ["Híbrido enchufable"] = "Plug-in hybrid",
        ["Cabrio"] = "Convertible",
        ["Automático"] = "Automatic",
        ["Manual"] = "Manual",
        ["Coupé"] = "Coupé",
        ["Familiar"] = "Estate",
        ["SUV"] = "SUV",
        ["Berlina"] = "Saloon",
        ["Compacto"] = "Hatchback",
        ["Roadster"] = "Roadster",
        ["Delantera"] = "Front-wheel drive",
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
    internal static string? Translate(string? value, bool english)
    {
        if (!english || string.IsNullOrEmpty(value)) return value;
        return EnglishValues.FirstOrDefault(x => English.CompareInfo.Compare(x.Key, value.Trim(),
            CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace) == 0).Value ?? value;
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
