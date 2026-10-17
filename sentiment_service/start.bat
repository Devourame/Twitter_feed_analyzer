@echo off
rem Starts the local Twitter-RoBERTa sentiment inference service (CPU, port 8001)
cd /d "%~dp0"
.venv\Scripts\python.exe app.py
