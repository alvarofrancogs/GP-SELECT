using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPowerHpAndDrivetrain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Drivetrain",
                table: "Vehicles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PowerHp",
                table: "Vehicles",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Drivetrain",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "PowerHp",
                table: "Vehicles");
        }
    }
}
