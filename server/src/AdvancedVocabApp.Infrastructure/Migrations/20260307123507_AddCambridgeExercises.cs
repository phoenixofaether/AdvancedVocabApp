using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AdvancedVocabApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCambridgeExercises : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CambridgeExercises",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Level = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExerciseType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CambridgeExercises", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CambridgeExercises_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CambridgeSkillProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Level = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ExerciseType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    AverageScore = table.Column<double>(type: "float", nullable: false),
                    LastAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CambridgeSkillProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CambridgeSkillProfiles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CambridgeExerciseAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExerciseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnswerJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Score = table.Column<double>(type: "float", nullable: true),
                    FeedbackJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TimeSpentSeconds = table.Column<int>(type: "int", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CambridgeExerciseAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CambridgeExerciseAttempts_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CambridgeExerciseAttempts_CambridgeExercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "CambridgeExercises",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CambridgeExerciseAttempts_ExerciseId",
                table: "CambridgeExerciseAttempts",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_CambridgeExerciseAttempts_UserId_ExerciseId",
                table: "CambridgeExerciseAttempts",
                columns: new[] { "UserId", "ExerciseId" });

            migrationBuilder.CreateIndex(
                name: "IX_CambridgeExercises_UserId",
                table: "CambridgeExercises",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CambridgeSkillProfiles_UserId_Level_ExerciseType",
                table: "CambridgeSkillProfiles",
                columns: new[] { "UserId", "Level", "ExerciseType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CambridgeExerciseAttempts");

            migrationBuilder.DropTable(
                name: "CambridgeSkillProfiles");

            migrationBuilder.DropTable(
                name: "CambridgeExercises");
        }
    }
}
