// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using System;
using System.IO;
using System.Net;
using ARCompletions.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ------------------------
// CORS：允許 swagger 與本機前端
// ------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ------------------------
// 資料庫設定：優先 Render Postgres（DATABASE_URL），否則回退 SQLite（DB_PATH）
// 並分流到不同的 MigrationsAssembly，避免把 SQLite 的遷移套到 PostgreSQL
// ------------------------
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var isPostgres = !string.IsNullOrWhiteSpace(databaseUrl);

if (isPostgres)
{
    // ---- PostgreSQL（Render）----
    // 例：postgres://user:pass@host:5432/dbname
    var uri = new Uri(databaseUrl!);
    var userInfoParts = uri.UserInfo.Split(':', 2);
    var user = WebUtility.UrlDecode(userInfoParts[0]);
    var pass = userInfoParts.Length > 1 ? WebUtility.UrlDecode(userInfoParts[1]) : "";
    var host = uri.Host;
    var port = uri.Port == -1 ? 5432 : uri.Port;
    var dbName = uri.AbsolutePath.Trim('/');

    // 手動組裝連線字串（不使用 NpgsqlConnectionStringBuilder）
    var pgConn =
        $"Host={host};Port={port};Database={dbName};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";

    builder.Services.AddDbContext<ARCompletionsContext>(opt =>
        opt.UseNpgsql(pgConn, b =>
        {
            // ⚠️ 請確保此組件包含 PostgreSQL 專用遷移與 ModelSnapshot
            b.MigrationsAssembly("ARCompletions.Migrations.Postgres");
        }));
}
else
{
    // ---- SQLite 後備（本機或未設定 DATABASE_URL 時）----
    string dbPath;
    var envDbPath = Environment.GetEnvironmentVariable("DB_PATH");
    if (!string.IsNullOrWhiteSpace(envDbPath))
    {
        Directory.CreateDirectory(Path.GetDirectoryName(envDbPath)!);
        dbPath = envDbPath!;
    }
    else
    {
        var dataDir = Path.Combine(builder.Environment.ContentRootPath, "Data");
        Directory.CreateDirectory(dataDir);
        dbPath = Path.Combine(dataDir, "ARCompletions.db");
    }

    builder.Services.AddDbContext<ARCompletionsContext>(opt =>
        opt.UseSqlite($"Data Source={dbPath}", b =>
        {
            // ⚠️ 請確保此組件包含 SQLite 專用遷移與 ModelSnapshot
            b.MigrationsAssembly("ARCompletions.Migrations.Sqlite");
        }));
}

// 其他服務
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ------------------------
// 健康檢查端點（Render 可用來探活）
// ------------------------
app.MapGet("/healthz", () => Results.Ok("ok"));

// ------------------------
// 啟動時自動處理「只改結構、不刷新資料」
// - 只呼叫 Migrate()；不使用 EnsureCreated()
// - 用 RUN_MIGRATIONS 控制是否自動執行（預設 true）
// ------------------------
var runMigrations = (Environment.GetEnvironmentVariable("RUN_MIGRATIONS") ?? "true")
                    .Equals("true", StringComparison.OrdinalIgnoreCase);

app.Logger.LogInformation("DB Provider: {Provider}", isPostgres ? "PostgreSQL" : "SQLite");
app.Logger.LogInformation("Auto-migrate on startup (RUN_MIGRATIONS): {Run}", runMigrations);

if (runMigrations)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ARCompletionsContext>();
    try
    {
        app.Logger.LogInformation("Applying EF Core migrations...");
        db.Database.Migrate(); // ✅ 只套用遷移（結構變更）；不動既有資料
        app.Logger.LogInformation("Migrations applied successfully.");
    }
    catch (Exception ex)
    {
        // ❌ 不要 fallback 到 EnsureCreated()，避免與遷移管線分歧或造成「看似清空」的錯覺
        app.Logger.LogError(ex, "Database.Migrate() failed. Not falling back to EnsureCreated().");
        throw;
    }
}

// ------------------------
// 中介層與靜態檔案
// ------------------------
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ARCompletions API v1");
    // c.RoutePrefix = string.Empty; // 若要根路徑顯示 Swagger UI 可解註
});

app.UseCors("AllowAll");

// wwwroot
app.UseStaticFiles();

// /Image 資料夾靜態檔案
var imagePath = Path.Combine(builder.Environment.ContentRootPath, "Image");
if (Directory.Exists(imagePath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(imagePath),
        RequestPath = "/Image"
    });
}
else
{
    app.Logger.LogWarning("Static image path not found: {Path}", imagePath);
}

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();

app.Run();
