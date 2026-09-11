@echo off
echo ============================================
echo  Sovereign AI Workbench - Backend
echo ============================================
echo.

cd /d "%~dp0..\backend"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting FastAPI backend on http://localhost:8000
echo.
python run.py
