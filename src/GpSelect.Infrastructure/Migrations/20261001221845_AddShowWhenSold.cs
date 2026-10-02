using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddShowWhenSold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShowWhenSold",
                table: "Vehicles",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowWhenSold",
                table: "Vehicles");
        }
    }
}
