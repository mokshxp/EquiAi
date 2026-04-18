@echo off
echo ╔══════════════════════════════════════╗
echo ║    EquiAI — Starting Backend         ║
echo ╚══════════════════════════════════════╝
echo.
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
echo Starting FastAPI on http://localhost:8000
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
