using GpSelect.Application;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GpSelect.Api;

/// <summary>Stores the enquiry (source of truth) and leaves the email to the notification outbox.
/// Closed unless Enquiries:Enabled is true: the privacy texts must exist before the form collects data.</summary>
[ApiController][Route("api/public/enquiries")]
public sealed class EnquiriesController(GpSelectDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost][EnableRateLimiting("enquiries")][RequestSizeLimit(32 * 1024)]
    public async Task<IActionResult> Create(CreateEnquiryRequest r, CancellationToken ct)
    {
        if (!config.GetValue<bool>("Enquiries:Enabled"))
            return DomainProblems.Create(this, new DomainException("enquiries_unavailable", "Enquiries are not available yet"));
        try
        {
            var intent = r.Intent ?? throw new DomainException("required", "intent is required", "intent");
            db.Enquiries.Add(Enquiry.Create(intent, r.Name, r.Email, r.Phone, r.Vehicle, r.Message, DateTimeOffset.UtcNow));
        }
        catch (DomainException e) { return DomainProblems.Create(this, e); }
        await db.SaveChangesAsync(ct);
        return Accepted(new { received = true });
    }
}
