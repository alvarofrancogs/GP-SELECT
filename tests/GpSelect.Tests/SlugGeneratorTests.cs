using GpSelect.Infrastructure;
using Xunit;

namespace GpSelect.Tests;

public sealed class SlugGeneratorTests
{
    [Theory]
    [InlineData("Straße", "ø æ œ ł đ þ", "^strasse-o-ae-oe-l-d-th-[0-9a-f]{32}$")]
    [InlineData("STRAẞE", "Ø Æ Œ Ł Đ Þ", "^strasse-o-ae-oe-l-d-th-[0-9a-f]{32}$")]
    [InlineData("Porsche", "911/992", "^porsche-911-992-[0-9a-f]{32}$")]
    [InlineData("  Citroën ", "DS 3  Crossback", "^citroen-ds-3-crossback-[0-9a-f]{32}$")]
    [InlineData("日本", "車", "^vehicle-[0-9a-f]{32}$")]
    public void Generate_ReturnsUrlSafeSlug(string make, string model, string expected)
    {
        var slug = new SlugGenerator().Generate(make, model);

        Assert.Matches(expected, slug);
        Assert.Matches("^[a-z0-9-]+$", slug);
    }
}
