using System.Collections.Concurrent;
using System.Data.Common;
using System.Net.Http.Json;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using Xunit;

namespace GpSelect.IntegrationTests;

/// <summary>The real API on a throwaway PostgreSQL: real migrations, cookie auth, CSRF and file storage.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AllowedOrigin = "https://admin.gpselect.test";
    public const string AdminEmail = "admin@gpselect.test";
    public const string AdminPassword = "Integration-Only-9";

    private readonly PostgreSqlContainer database = new PostgreSqlBuilder().WithImage("postgres:16-alpine").Build();
    private readonly string storageRoot = Path.Combine(Path.GetTempPath(), "gpselect-it-" + Guid.NewGuid().ToString("N"));
    public SqlLog Sql { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not Development: cookies are Secure, so clients use an https base address.
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", database.GetConnectionString());
        builder.UseSetting("Security:AllowedOrigin", AllowedOrigin);
        builder.UseSetting("Admin:Email", AdminEmail);
        builder.UseSetting("Admin:PasswordHash", new PasswordHasher<object>().HashPassword(null!, AdminPassword));
        builder.UseSetting("Storage:Provider", "File");
        builder.UseSetting("Storage:Root", storageRoot);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<GpSelectDbContext>>();
            services.AddDbContext<GpSelectDbContext>(o => o.UseNpgsql(database.GetConnectionString()).AddInterceptors(Sql));
        });
    }

    /// <summary>Signed in once for the whole run: the login endpoint allows 5 attempts per minute.
    /// Sends the allowed Origin, as the admin frontend will.</summary>
    public HttpClient Admin { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await database.StartAsync();
        using (var scope = Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<GpSelectDbContext>().Database.MigrateAsync();

        Admin = Anonymous();
        (await Admin.PostAsJsonAsync("/api/admin/auth/login", new { email = AdminEmail, password = AdminPassword })).EnsureSuccessStatusCode();
        Admin.DefaultRequestHeaders.Add("Origin", AllowedOrigin);
    }

    public HttpClient Anonymous() => CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await database.DisposeAsync();
        if (Directory.Exists(storageRoot)) Directory.Delete(storageRoot, recursive: true);
    }
}

/// <summary>Records the SQL issued through EF, to prove list endpoints do not query per row.</summary>
public sealed class SqlLog : DbCommandInterceptor
{
    private readonly ConcurrentQueue<string> commands = new();
    public void Clear() => commands.Clear();
    public IReadOnlyList<string> Commands => commands.ToList();

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    {
        commands.Enqueue(command.CommandText);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }
}
