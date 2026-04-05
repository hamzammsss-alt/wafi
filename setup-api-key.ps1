# Quick Setup Script for Smart Assistant
# Run this script to configure the API key and restart the server

Write-Host "🔧 Setting up Smart Assistant API Key..." -ForegroundColor Cyan

# Update .env.local with the correct variable name
$apiKey = "VITE_GEMINI_API_KEY=AIzaSyAEu0rGwmvyO6XaZfmWTkrdgOe0HsvmVvs"
Set-Content -Path ".env.local" -Value $apiKey

Write-Host "✅ API Key configured in .env.local" -ForegroundColor Green

# Check if the file was created successfully
if (Test-Path ".env.local") {
    Write-Host "✅ File .env.local exists" -ForegroundColor Green
    Write-Host "📄 Content:" -ForegroundColor Yellow
    Get-Content ".env.local"
} else {
    Write-Host "❌ Failed to create .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔄 Please restart the dev server:" -ForegroundColor Cyan
Write-Host "   1. Press Ctrl+C to stop the current server" -ForegroundColor White
Write-Host "   2. Run: npm run dev" -ForegroundColor White
Write-Host "`n✨ After restart, the Smart Assistant should work!" -ForegroundColor Green
