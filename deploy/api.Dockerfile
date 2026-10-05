# Build context: the repository root (see docker-compose.yml).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY GpSelect.sln Directory.Build.props ./
COPY src/ src/
RUN dotnet publish src/GpSelect.Api/GpSelect.Api.csproj -c Release -o /out

# In Production the API applies pending migrations itself when it starts.
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
RUN mkdir -p /data/keys && chown -R app:app /data
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "GpSelect.Api.dll"]
