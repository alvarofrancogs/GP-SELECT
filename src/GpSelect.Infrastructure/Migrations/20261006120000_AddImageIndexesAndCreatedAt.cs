using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations;

public partial class AddImageIndexesAndCreatedAt : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Existing intents get a full 24-hour grace period from deployment.
        migrationBuilder.AddColumn<DateTimeOffset>(name: "CreatedAt", table: "Images",
            type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP");
        migrationBuilder.AddColumn<DateTimeOffset>(name: "StorageCleanedAt", table: "Images",
            type: "timestamp with time zone", nullable: true);
        migrationBuilder.CreateIndex(name: "IX_Images_VehicleUnitId_All", table: "Images", column: "VehicleUnitId");
        migrationBuilder.CreateIndex(name: "IX_Images_OriginalKey", table: "Images", column: "OriginalKey");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Images_VehicleUnitId_All", table: "Images");
        migrationBuilder.DropIndex(name: "IX_Images_OriginalKey", table: "Images");
        migrationBuilder.DropColumn(name: "CreatedAt", table: "Images");
        migrationBuilder.DropColumn(name: "StorageCleanedAt", table: "Images");
    }
}
