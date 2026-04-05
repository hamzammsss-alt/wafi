# Wafi ERP Backend (.NET 8)

This directory contains the source code for the WAFI ERP Backend API, built with **.NET 8** and **Clean Architecture**.

## Solution Structure
- **Wafi.API**: The Web API project (Controllers, Program.cs). This is the entry point.
- **Wafi.Core**: The domain layer (Entities, Interfaces).
- **Wafi.Infrastructure**: The data access layer (EF Core DbContext, Repositories, Services).

## Prerequisites
- .NET SDK 8.0+
- PostgreSQL Database
- VS Code or Visual Studio 2022

## How to Run
1. Navigate to the API folder:
   ```powershell
   cd Wafi.API
   ```
2. Run the application:
   ```powershell
   dotnet run
   ```
   The API will start at `http://localhost:5000` (or similar, check output).

## Database Setup
The connection string is located in `Wafi.API/appsettings.json`.
Default: `Host=localhost;Database=WafiDb;Username=postgres;Password=postgres`

### Applying Migrations
Due to environment restrictions, you may need to install the EF Core tools manually:
```powershell
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate --project ../Wafi.API/Wafi.API.csproj --startup-project ../Wafi.API/Wafi.API.csproj --context Wafi.Infrastructure.Data.ApplicationDbContext
dotnet ef database update
```

## Authentication
The system uses JWT (JSON Web Tokens).
- **Login Endpoint**: `POST /api/auth/login`
- **Frontend Client**: `c:/wafi/services/apiClient.ts` automatically attaches the token.
