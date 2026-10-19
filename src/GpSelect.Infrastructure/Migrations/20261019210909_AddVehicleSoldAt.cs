using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleSoldAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SoldAt",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            // Vehicles already sold have no sale date: their last change is the closest one.
            migrationBuilder.Sql("UPDATE \"Vehicles\" SET \"SoldAt\" = \"UpdatedAt\" WHERE \"Status\" = 'Sold';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SoldAt",
                table: "Vehicles");
        }
    }
}
