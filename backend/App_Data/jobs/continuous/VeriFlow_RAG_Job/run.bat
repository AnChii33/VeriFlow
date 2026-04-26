@echo off
echo [SYSTEM] Starting VeriFlow RAG Deployment...

:: Install/Update dependencies
echo [SYSTEM] Installing dependencies from requirements.txt...
pip install -r requirements.txt

:: Launch the main loop
echo [SYSTEM] Launching autoloop.py...
python autoloop.py