using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations;

public partial class UniqueImageJobPerImage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Old concurrent completes may already have duplicates; keep the active job first.
        migrationBuilder.Sql("""
            DELETE FROM "ImageJobs" WHERE "Id" IN (
                SELECT "Id" FROM (
                    SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "ImageId" ORDER BY
                        CASE "State" WHEN 'Processing' THEN 0 WHEN 'Queued' THEN 1 ELSE 2 END,
                        "CreatedAt", "Id") AS rank
                    FROM "ImageJobs"
                ) duplicates WHERE rank > 1
            );
            """);
        migrationBuilder.DropIndex(name: "IX_ImageJobs_ImageId", table: "ImageJobs");
        migrationBuilder.CreateIndex(name: "IX_ImageJobs_ImageId", table: "ImageJobs", column: "ImageId", unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_ImageJobs_ImageId", table: "ImageJobs");
        migrationBuilder.CreateIndex(name: "IX_ImageJobs_ImageId", table: "ImageJobs", column: "ImageId");
    }
}
