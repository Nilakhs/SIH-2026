@echo off
echo ============================================
echo  Sovereign AI Workbench - Frontend
echo ============================================
echo.

cd /d "%~dp0..\frontend"

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo.
echo Starting React frontend on http://localhost:5173
echo.
npm run dev
