using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

/// <summary>A PATCH validates against the vehicle as it is once it holds the row lock, never against a copy read
/// while another transaction (publish, save, archive) was still changing it.</summary>
public sealed class VehiclePatchLockTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    private async Task<Guid> CreateDraft()
    {
        var response = await api.Admin.PostAsJsonAsync("/api/admin/vehicles",
            new { make = "BMW", model = "M4", firstRegistrationYear = 2023, firstRegistrationMonth = 6 });
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }

    /// <summary>Runs <paramref name="change"/> in a transaction that holds the vehicle's row lock, sends the PATCH,
    /// waits until PostgreSQL shows the PATCH blocked on that lock and only then commits. The order is fixed:
    /// the PATCH always starts before the change is visible and finishes after it.</summary>
    private async Task<HttpResponseMessage> PatchWhileLocked(Guid id, FormattableString change, object patch)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        await using var tx = await db.Database.BeginTransactionAsync();
        Assert.NotNull(await db.LockVehicleAsync(id));
        await db.Database.ExecuteSqlInterpolatedAsync(change);

        var sent = api.Admin.PatchAsync($"/api/admin/vehicles/{id}", JsonContent.Create(patch));
        await WaitForLockWaiter(sent);
        await tx.CommitAsync();
        return await sent;
    }

    private async Task WaitForLockWaiter(Task<HttpResponseMessage> request)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        for (var i = 0; i < 200; i++)
        {
            Assert.False(request.IsCompleted, "The PATCH finished without waiting for the vehicle lock.");
            var waiting = await db.Database.SqlQuery<int>(
                $"SELECT count(*)::int AS \"Value\" FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'").SingleAsync();
            if (waiting > 0) return;
            await Task.Delay(50);
        }
        throw new TimeoutException("The PATCH never reached the vehicle lock.");
    }

    private async Task<(string Status, string Model, decimal? Price)> Stored(Guid id)
    {
        using var scope = api.Services.CreateScope();
        var v = await scope.ServiceProvider.GetRequiredService<GpSelectDbContext>().Vehicles.AsNoTracking().SingleAsync(x => x.Id == id);
        return (v.Status.ToString(), v.Model, v.PriceEur);
    }

    [Fact]
    public async Task Patch_cannot_zero_the_price_of_a_vehicle_published_meanwhile()
    {
        var id = await CreateDraft();

        var response = await PatchWhileLocked(id,
            $"UPDATE \"Vehicles\" SET \"Status\" = 'Available', \"PriceEur\" = 25000 WHERE \"Id\" = {id}", new { priceEur = 0 });

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.UnprocessableEntity, $"{(int)response.StatusCode}: {body}");
        Assert.Equal("price_zero", JsonDocument.Parse(body).RootElement.GetProperty("code").GetString());
        Assert.Equal(("Available", "M4", (decimal?)25000m), await Stored(id));
    }

    [Fact]
    public async Task Patch_does_not_edit_a_vehicle_archived_before_it_got_the_lock()
    {
        var id = await CreateDraft();

        var response = await PatchWhileLocked(id,
            $"UPDATE \"Vehicles\" SET \"Status\" = 'Archived' WHERE \"Id\" = {id}", new { model = "M4 CS" });

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.Conflict, $"{(int)response.StatusCode}: {body}");
        Assert.Equal("archived", JsonDocument.Parse(body).RootElement.GetProperty("code").GetString());
        Assert.Equal(("Archived", "M4", (decimal?)null), await Stored(id));
    }

    [Fact]
    public async Task Patch_still_edits_and_answers_404_without_a_lock_holder()
    {
        var id = await CreateDraft();
        var response = await api.Admin.PatchAsync($"/api/admin/vehicles/{id}", JsonContent.Create(new { model = "M4 CS", priceEur = 100.5m }));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(("Draft", "M4 CS", (decimal?)100.5m), await Stored(id));

        var missing = await api.Admin.PatchAsync($"/api/admin/vehicles/{Guid.NewGuid()}", JsonContent.Create(new { model = "X" }));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }
}
