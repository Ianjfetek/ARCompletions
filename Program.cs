// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using ARCompletions.Data;
using Microsoft.EntityFrameworkCore;

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
builder.Services.AddDbContext<ARCompletions.Data.ARCompletionsContext>(opt =>
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
    var db = scope.ServiceProvider.GetRequiredService<ARCompletions.Data.ARCompletionsContext>();
    db.Database.Migrate();
}

// 健康檢查端點（Render 可用來探活）
// app.MapGet("/healthz", () => Results.Ok("ok"));

if (app.Environment.IsDevelopment())
{
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ARCompletions API v1");
    // 若要根路徑顯示 Swagger UI，取消註解下行
    // c.RoutePrefix = string.Empty;
});
}

app.UseCors("AllowAll");

// 允許存取 wwwroot 及根目錄下的靜態檔案（如 /Image/xx.jpg）
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();

app.Run();
