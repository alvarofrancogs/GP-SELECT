using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace GpSelect.Infrastructure;

public sealed partial class SlugGenerator: GpSelect.Application.ISlugGenerator
{
    public string Generate(string make, string model)
    {
        var transliterated = $"{make} {model}".ToLowerInvariant()
            .Replace("ß", "ss").Replace("ẞ", "ss").Replace("ø", "o").Replace("æ", "ae")
            .Replace("œ", "oe").Replace("ł", "l").Replace("đ", "d").Replace("þ", "th");
        var decomposed = transliterated.Normalize(NormalizationForm.FormD);
        var withoutMarks = new StringBuilder();
        foreach (var c in decomposed)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                withoutMarks.Append(c);

        var baseSlug = NotSlugChars().Replace(withoutMarks.ToString(), "-").Trim('-');
        if (baseSlug.Length == 0) baseSlug = "vehicle";
        return $"{baseSlug}-{Guid.NewGuid():N}";
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NotSlugChars();
}
