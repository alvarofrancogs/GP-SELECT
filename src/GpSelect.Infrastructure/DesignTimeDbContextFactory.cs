using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace GpSelect.Infrastructure;
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<GpSelectDbContext>
{
 public GpSelectDbContext CreateDbContext(string[] args)
 { var b=new DbContextOptionsBuilder<GpSelectDbContext>(); b.UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__Default") ?? "Host=localhost;Database=gpselect;Username=postgres;Password=postgres"); return new GpSelectDbContext(b.Options); }
}
