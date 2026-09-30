using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace GpSelect.Api;

/// <summary>Kestrel rejects some requests by throwing (body over RequestSizeLimit → 413, malformed → 400).
/// Without this the exception handler reports them as 500.</summary>
public sealed class BadRequestExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        if (exception is not BadHttpRequestException bad) return false;
        context.Response.StatusCode = bad.StatusCode;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = bad.StatusCode,
            Title = bad.StatusCode == StatusCodes.Status413PayloadTooLarge ? "Request body too large" : "Bad request",
            Extensions = { ["code"] = "request_rejected", ["correlationId"] = context.TraceIdentifier },
        }, options: null, contentType: "application/problem+json", cancellationToken: ct);
        return true;
    }
}
