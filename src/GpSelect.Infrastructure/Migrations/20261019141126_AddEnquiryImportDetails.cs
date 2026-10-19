using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEnquiryImportDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Delivery",
                table: "Enquiries",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Mileage",
                table: "Enquiries",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Timeframe",
                table: "Enquiries",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleYear",
                table: "Enquiries",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Delivery",
                table: "Enquiries");

            migrationBuilder.DropColumn(
                name: "Mileage",
                table: "Enquiries");

            migrationBuilder.DropColumn(
                name: "Timeframe",
                table: "Enquiries");

            migrationBuilder.DropColumn(
                name: "VehicleYear",
                table: "Enquiries");
        }
    }
}
