// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using System;
using System.IO;
using ARCompletions.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Npgsql; // ← 新增：PostgreSQL 連線字串建構

var builder = WebApplication.CreateBuilder(args);

// CORS：允許 swagger 與本機前端
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// === 資料庫設定：優先 Render Postgres（DATABASE_URL），否則回退 SQLite（DB_PATH） ===
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrWhiteSpace(databaseUrl))
{
    // ---- PostgreSQL（Render Postgres）----
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);

    var npgsql = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port == -1 ? 5432 : uri.Port,
        Database = uri.AbsolutePath.Trim('/'),
        Username = userInfo[0],
        Password = userInfo.Length > 1 ? userInfo[1] : "",
        SslMode = SslMode.Require,
        TrustServerCertificate = true // Render 內網可先開；正式可改嚴格驗證
    }.ToString();

    builder.Services.AddDbContext<ARCompletionsContext>(opt =>
        opt.UseNpgsql(npgsql));
}
else
{
    // ---- SQLite 後備（本機或未設定 DATABASE_URL 時）----
    string dbPath;
    var envDbPath = Environment.GetEnvironmentVariable("DB_PATH");
    if (!string.IsNullOrWhiteSpace(envDbPath))
    {
        Directory.CreateDirectory(Path.GetDirectoryName(envDbPath)!);
        dbPath = envDbPath;
    }
    else
    {
        var dataDir = Path.Combine(builder.Environment.ContentRootPath, "Data");
        Directory.CreateDirectory(dataDir);
        dbPath = Path.Combine(dataDir, "ARCompletions.db");
    }

    builder.Services.AddDbContext<ARCompletionsContext>(opt =>
        opt.UseSqlite($"Data Source={dbPath}"));
}

// 其他服務
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 健康檢查端點（Render 可用來探活）
app.MapGet("/healthz", () => Results.Ok("ok"));

// 啟動時自動處理資料庫（先嘗試遷移，失敗再 EnsureCreated 一次）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ARCompletionsContext>();
    try
    {
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        // 若你目前只有 SQLite 的遷移而轉到 PG，Migrate 可能會因提供者不同而失敗
        app.Logger.LogWarning(ex, "Database.Migrate() 失敗，改用 EnsureCreated() 建表。");
        db.Database.EnsureCreated();
    }
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ARCompletions API v1");
    // c.RoutePrefix = string.Empty; // 若要根路徑顯示 Swagger UI 就解註
});

app.UseCors("AllowAll");

// ======= 靜態檔案設定 =======
app.UseStaticFiles(); // wwwroot

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
// ===========================

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();

app.Run();
