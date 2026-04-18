@echo off
echo ╔══════════════════════════════════════╗
echo ║       EquiAI — Backend Setup         ║
echo ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0backend"

echo [1/3] Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo [2/3] Activating venv and installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo [3/3] Setup complete!
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  IMPORTANT: Add your Gemini API key to backend\.env  ║
echo ║  Copy .env.example → .env and fill in the key        ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause
