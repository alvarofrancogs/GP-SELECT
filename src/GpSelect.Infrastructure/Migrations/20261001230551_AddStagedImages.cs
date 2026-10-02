using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStagedImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsStaged",
                table: "Images",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsStaged",
                table: "Images");
        }
    }
}
