using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace GpSelect.Api;

/// <summary>Shared by the image and video upload endpoints: idempotency keys and the archived-vehicle guard.</summary>
internal static class AdminWrites
{
    public static string Hash(object value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }))));

    public static string? IdempotencyKey(this ControllerBase c) => c.Request.Headers["Idempotency-Key"].FirstOrDefault();

    public static bool IsValidKey(string? key) => !string.IsNullOrWhiteSpace(key) && key.Length <= 200;

    public static IActionResult Replay(this ControllerBase c, string hash, IdempotencyRecord old) =>
        old.RequestHash == hash
            ? new ContentResult { StatusCode = old.StatusCode, ContentType = "application/json", Content = old.ResponseJson }
            : c.Problem(statusCode: 409, title: "Idempotency key was already used with a different payload", detail: "Use a new Idempotency-Key.");

    /// <summary>Locks the vehicle. Null when its media can change; otherwise the response to send (404, or 409 archived).</summary>
    public static async Task<IActionResult?> RefuseUnlessEditable(this ControllerBase c, GpSelectDbContext db, Guid vehicleId)
    {
        var vehicle = await db.LockVehicleAsync(vehicleId);
        if (vehicle is null)
            return c.NotFound();
        try
        {
            VehicleGallery.EnsureEditable(vehicle);
        }
        catch (DomainException e)
        {
            return DomainProblems.Create(c, e);
        }
        return null;
    }
}
