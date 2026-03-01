using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AdvancedVocabApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UniqueVacabEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Word",
                table: "VocabEntries",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Language",
                table: "VocabEntries",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_VocabEntries_Word_Language_CreatedByUserId",
                table: "VocabEntries",
                columns: new[] { "Word", "Language", "CreatedByUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VocabEntries_Word_Language_CreatedByUserId",
                table: "VocabEntries");

            migrationBuilder.AlterColumn<string>(
                name: "Word",
                table: "VocabEntries",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Language",
                table: "VocabEntries",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
