@echo off
echo Creating .env.local file...
echo VITE_GEMINI_API_KEY=AIzaSyAEu0rGwmvyO6XaZfmWTkrdgOe0HsvmVvs > .env.local
echo.
echo ✅ File created successfully!
echo.
echo 📄 Content of .env.local:
type .env.local
echo.
echo.
echo ⚠️  IMPORTANT: You must restart the dev server!
echo    1. Press Ctrl+C in the terminal running 'npm run dev'
echo    2. Run: npm run dev
echo.
pause
