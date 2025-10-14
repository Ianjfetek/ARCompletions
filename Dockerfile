# ---------- Build stage ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.sln ./
COPY ARCompletions.csproj ./
RUN dotnet restore ARCompletions.csproj
COPY . .
RUN dotnet publish ARCompletions.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---------- Runtime stage ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish ./

# Render 會提供 $PORT，這裡綁定到該埠
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080}
ENTRYPOINT ["dotnet", "ARCompletions.dll"]
