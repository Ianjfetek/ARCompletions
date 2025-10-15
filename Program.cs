// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using ARCompletions.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;   // ← 重要：用於靜態檔案對應

var builder = WebApplication.CreateBuilder(args);

// CORS：允許 swagger 與本機前端
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()
    );
});

// --- SQLite 連線：優先環境變數 DB_PATH，否則落到 Data/ARCompletions.db ---
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

// 註冊 DbContext（用你現有的 ARCompletionsContext）
builder.Services.AddDbContext<ARCompletionsContext>(opt =>
    opt.UseSqlite($"Data Source={dbPath}"));

// 其他服務
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 健康檢查端點（Render 可用來探活）
app.MapGet("/healthz", () => Results.Ok("ok"));

// 啟動自動套用 Migration（第一次會自動建 DB）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ARCompletionsContext>();
    db.Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ARCompletions API v1");
    // c.RoutePrefix = string.Empty; // 若要根路徑顯示 Swagger UI 就解註
});

app.UseCors("AllowAll");

// ======= 靜態檔案設定 =======
// 1) 啟用 wwwroot（若有）
app.UseStaticFiles();

// 2) 對應專案根目錄的「Image」資料夾到 /Image 路徑
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
