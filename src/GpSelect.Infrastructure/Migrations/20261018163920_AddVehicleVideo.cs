using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleVideo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Images",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Photo");

            migrationBuilder.AddColumn<Guid>(
                name: "VideoId",
                table: "Images",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Videos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleUnitId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    MimeType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    State = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsStaged = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StorageCleanedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Videos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Videos_Vehicles_VehicleUnitId",
                        column: x => x.VehicleUnitId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Videos_Key",
                table: "Videos",
                column: "Key");

            migrationBuilder.CreateIndex(
                name: "IX_Videos_VehicleUnitId_Published",
                table: "Videos",
                column: "VehicleUnitId",
                unique: true,
                filter: "\"IsStaged\" = FALSE AND \"State\" <> 'Deleted'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Videos");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "VideoId",
                table: "Images");
        }
    }
}
