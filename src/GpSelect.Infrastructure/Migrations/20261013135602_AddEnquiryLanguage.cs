using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GpSelect.Infrastructure.Migrations;

public partial class AddEnquiryLanguage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Every enquiry stored before this column came from the Spanish form.
        migrationBuilder.AddColumn<string>(name: "Language", table: "Enquiries", type: "character varying(2)", maxLength: 2, nullable: false, defaultValue: "Es");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Language", table: "Enquiries");
    }
}
