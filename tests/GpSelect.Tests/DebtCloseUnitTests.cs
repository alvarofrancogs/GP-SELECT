using GpSelect.Domain;
using GpSelect.Infrastructure;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace GpSelect.Tests;

public class DebtCloseUnitTests
{
    static async Task<MemoryStream> Jpeg(int width, int height, ushort? orientation = null)
    {
        using var image = new Image<Rgb24>(width, height, new Rgb24(90, 90, 90));
        if (orientation is { } value)
        {
            image.Metadata.ExifProfile = new ExifProfile();
            image.Metadata.ExifProfile.SetValue(ExifTag.Orientation, value);
        }
        var stream = new MemoryStream();
        await image.SaveAsJpegAsync(stream);
        return stream;
    }

    [Theory]
    [InlineData(6000, 4000, null, 2400, 1600, 800, 533)]
    // EXIF 6 = rotate 90°: stored landscape, shown portrait.
    [InlineData(6000, 4000, (ushort)6, 1200, 1800, 400, 600)]
    public async Task Large_photos_are_decoded_reduced_and_still_give_full_size_derivatives(int width, int height, ushort? orientation,
        int detailWidth, int detailHeight, int cardWidth, int cardHeight)
    {
        await using var input = await Jpeg(width, height, orientation);
        using var source = await ImagePipeline.DecodeAsync(input, "image/jpeg", CancellationToken.None);
        Assert.True(Math.Max(source.Width, source.Height) <= 2400);
        Assert.Null(source.Metadata.ExifProfile);

        var (card, detail) = await ImagePipeline.RenderAsync(source, CancellationToken.None);
        await using (card) await using (detail)
        {
            var detailInfo = await Image.IdentifyAsync(detail);
            var cardInfo = await Image.IdentifyAsync(card);
            Assert.Equal((detailWidth, detailHeight), (detailInfo.Width, detailInfo.Height));
            Assert.Equal((cardWidth, cardHeight), (cardInfo.Width, cardInfo.Height));
        }
    }

    [Fact]
    public void Enquiry_email_has_a_stable_message_id()
    {
        var enquiry = Enquiry.Create(EnquiryIntent.Search, "María Pérez", "customer@example.test", null, null, "Busco un vehículo.", DateTimeOffset.UtcNow);
        var notification = EnquiryNotification.For(enquiry);
        using var first = SmtpEnquiryNotifier.BuildMessage(notification, "sender@example.test", "recipient@example.test");
        using var resend = SmtpEnquiryNotifier.BuildMessage(notification, "sender@example.test", "recipient@example.test");
        Assert.Equal($"{enquiry.Id:N}@enquiry.gpselect", first.MessageId);
        Assert.Equal(first.MessageId, resend.MessageId);
    }

    [Fact]
    public void Equipment_is_deduplicated_and_an_oversized_list_stops_at_the_limit()
    {
        Assert.Equal("[\"Techo\",\"Navegador\"]", VehicleContent.WriteEquipment(["Techo", "techo", " Navegador ", "TECHO"]));
        var huge = Enumerable.Range(0, 200_000).Select(i => (string?)$"Item {i}").ToList();
        var error = Assert.Throws<DomainException>(() => VehicleContent.WriteEquipment(huge));
        Assert.Equal("too_many", error.Code);
    }
}
