using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class EnquiryApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    private static object Body(string message = "Busco un coche familiar, gracias.", string intent = "Search", string? vehicle = null, string name = "Ana López") =>
        new { intent, name, email = "ana@example.test", phone = "+34 600 000 000", vehicle, message };

    private static HttpRequestMessage Post(object body, string peer)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/public/enquiries") { Content = JsonContent.Create(body) };
        request.Headers.Add("X-Test-Peer", peer);
        return request;
    }

    private async Task<T> Db<T>(Func<GpSelectDbContext, Task<T>> query)
    {
        using var scope = api.Services.CreateScope();
        return await query(scope.ServiceProvider.GetRequiredService<GpSelectDbContext>());
    }

    private static async Task<JsonElement> Read(HttpResponseMessage response, HttpStatusCode expected)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == expected, $"expected {expected}, got {(int)response.StatusCode}: {body}");
        return JsonDocument.Parse(body).RootElement;
    }

    [Fact]
    public async Task Valid_enquiry_is_stored_pending_and_the_answer_reveals_nothing_else()
    {
        var marker = "Marcador " + Guid.NewGuid().ToString("N");
        var body = await Read(await api.Anonymous().SendAsync(Post(Body(marker, "Vehicle", "porsche-911-x", "  Ana \n López "), "198.51.100.60")), HttpStatusCode.Accepted);
        Assert.Equal("""{"received":true}""", body.GetRawText());

        var stored = await Db(db => db.Enquiries.AsNoTracking().SingleAsync(x => x.Message == marker));
        Assert.Equal((EnquiryIntent.Vehicle, "Ana López", "ana@example.test", "+34 600 000 000", "porsche-911-x"), (stored.Intent, stored.Name, stored.Email, stored.Phone, stored.Vehicle));
        Assert.Equal((EnquiryNotificationStatus.Pending, 0), (stored.NotificationStatus, stored.NotificationAttempts));
        Assert.InRange(stored.CreatedAt, DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddSeconds(5));
    }

    private static int invalidPeer;

    [Theory]
    [InlineData("""{"intent":"Search","name":"A","email":"ana@example.test","message":"Busco un coche familiar."}""", "name")]
    [InlineData("""{"intent":"Search","name":"Ana","email":"ana@example","message":"Busco un coche familiar."}""", "email")]
    [InlineData("""{"intent":"Search","name":"Ana","email":"ana@example.test","phone":"123","message":"Busco un coche familiar."}""", "phone")]
    [InlineData("""{"intent":"Vehicle","name":"Ana","email":"ana@example.test","message":"Busco un coche familiar."}""", "vehicle")]
    [InlineData("""{"intent":"Search","name":"Ana","email":"ana@example.test","message":"Corto"}""", "message")]
    [InlineData("""{"intent":"Search","name":"Ana\u0000","email":"ana@example.test","message":"Busco un coche familiar."}""", "name")]
    [InlineData("""{"name":"Ana","email":"ana@example.test","message":"Busco un coche familiar."}""", "intent")]
    public async Task Invalid_fields_answer_400_with_code_and_field(string json, string field)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/public/enquiries") { Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json") };
        // Invalid requests also count towards the limit: one client per case.
        request.Headers.Add("X-Test-Peer", $"198.51.101.{Interlocked.Increment(ref invalidPeer)}");
        var problem = await Read(await api.Anonymous().SendAsync(request), HttpStatusCode.BadRequest);
        Assert.Equal(field, problem.GetProperty("field").GetString());
        Assert.True(problem.TryGetProperty("code", out _));
        Assert.False(problem.TryGetProperty("exception", out _));
    }

    [Fact]
    public async Task Unknown_intent_and_numeric_intent_are_rejected()
    {
        foreach (var intent in new object[] { "Buy", 0 })
        {
            var request = Post(new { intent, name = "Ana", email = "ana@example.test", message = "Busco un coche familiar." }, "198.51.100.62");
            Assert.Equal(HttpStatusCode.BadRequest, (await api.Anonymous().SendAsync(request)).StatusCode);
        }
    }

    [Fact]
    public async Task Disabled_enquiries_answer_503_and_store_nothing()
    {
        using var closed = api.WithWebHostBuilder(b => b.UseSetting("Enquiries:Enabled", "false"));
        var marker = "Cerrado " + Guid.NewGuid().ToString("N");
        var problem = await Read(await closed.CreateClient(new() { BaseAddress = new Uri("https://localhost") }).SendAsync(Post(Body(marker), "198.51.100.63")), HttpStatusCode.ServiceUnavailable);
        Assert.Equal("enquiries_unavailable", problem.GetProperty("code").GetString());
        Assert.False(await Db(db => db.Enquiries.AnyAsync(x => x.Message == marker)));
    }

    [Fact]
    public async Task Enquiries_are_limited_per_client()
    {
        using var client = api.Anonymous();
        for (var i = 0; i < 5; i++) Assert.Equal(HttpStatusCode.Accepted, (await client.SendAsync(Post(Body(), "198.51.100.64"))).StatusCode);
        var problem = await Read(await client.SendAsync(Post(Body(), "198.51.100.64")), HttpStatusCode.TooManyRequests);
        Assert.Equal("rate_limited", problem.GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Accepted, (await client.SendAsync(Post(Body(), "198.51.100.65"))).StatusCode);
    }

    [Fact]
    public async Task Other_origins_get_no_cors_permission()
    {
        var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/public/enquiries");
        preflight.Headers.Add("Origin", "https://evil.example");
        preflight.Headers.Add("Access-Control-Request-Method", "POST");
        preflight.Headers.Add("Access-Control-Request-Headers", "content-type");
        Assert.False((await api.Anonymous().SendAsync(preflight)).Headers.Contains("Access-Control-Allow-Origin"));
    }

    /// <summary>Fails the first attempts for one enquiry only: other tests' enquiries share the database.</summary>
    private sealed class FlakyNotifier(string marker, int failures) : IEnquiryNotifier
    {
        public List<EnquiryNotification> Sent { get; } = [];
        private int remaining = failures;
        public Task SendAsync(EnquiryNotification notification, CancellationToken ct)
        {
            if (notification.Body.Contains(marker) && remaining-- > 0) throw new InvalidOperationException("provider down");
            Sent.Add(notification);
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task A_failing_email_keeps_the_enquiry_and_is_retried_until_sent()
    {
        var marker = "Outbox " + Guid.NewGuid().ToString("N");
        await Read(await api.Anonymous().SendAsync(Post(Body(marker, "Vehicle", "bmw-m4-x"), "198.51.100.66")), HttpStatusCode.Accepted);
        var notifier = new FlakyNotifier(marker, failures: 1);
        var now = DateTimeOffset.UtcNow.AddSeconds(1);

        async Task<Enquiry> Pass(DateTimeOffset at)
        {
            using var scope = api.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
            await new EnquiryNotificationOutbox(db, notifier, NullLogger<EnquiryNotificationOutbox>.Instance).SendDueAsync(at, CancellationToken.None, batch: 1000);
            return await db.Enquiries.AsNoTracking().SingleAsync(x => x.Message == marker);
        }

        var failed = await Pass(now);
        Assert.Equal((EnquiryNotificationStatus.Pending, 1), (failed.NotificationStatus, failed.NotificationAttempts));
        Assert.Equal(now.AddMinutes(1), failed.NotificationNextAttemptAt, TimeSpan.FromMilliseconds(1));

        Assert.Equal(1, (await Pass(now.AddSeconds(30))).NotificationAttempts); // not due yet
        var sent = await Pass(now.AddMinutes(2));
        Assert.Equal((EnquiryNotificationStatus.Sent, 2), (sent.NotificationStatus, sent.NotificationAttempts));

        var mail = Assert.Single(notifier.Sent, x => x.EnquiryId == sent.Id);
        Assert.DoesNotContain('\n', mail.Subject);
        Assert.Equal("ana@example.test", mail.ReplyTo);
        Assert.Contains("bmw-m4-x", mail.Body);
        Assert.Contains(marker, mail.Body);
    }
}
