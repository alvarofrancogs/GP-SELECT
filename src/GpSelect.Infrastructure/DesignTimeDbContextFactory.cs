using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace GpSelect.Infrastructure;
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<GpSelectDbContext>
{
 public GpSelectDbContext CreateDbContext(string[] args)
 {
  var connection=Environment.GetEnvironmentVariable("ConnectionStrings__Default");
  if(string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("Set ConnectionStrings__Default before running dotnet ef (see docs/BACKEND-SETUP.md).");
  var b=new DbContextOptionsBuilder<GpSelectDbContext>(); b.UseNpgsql(connection); return new GpSelectDbContext(b.Options);
 }
}
