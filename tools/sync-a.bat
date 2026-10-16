@echo off
rem =====================================================================
rem  sync-a: Review and apply edits made in DaVnky-A back to DaV-nky
rem =====================================================================
cd /d "%~dp0.."

set "PY="
if exist "%LocalAppData%\Python\bin\python.exe" set "PY=%LocalAppData%\Python\bin\python.exe"
if not defined PY where py >nul 2>nul && set "PY=py"
if not defined PY where python >nul 2>nul && set "PY=python"

if not defined PY (
    echo Python not found. Please install Python.
    pause
    goto :eof
)

if "%~1"=="" (
    %PY% tools\sync-a.py status
    echo.
    echo -------------------------------------------------------------
    echo Options:
    echo   tools\sync-a.bat diff          (view exact line differences)
    echo   tools\sync-a.bat apply         (apply changes after confirmation)
echo   tools\sync-a.bat refresh       (copy DaV-nky's newer files into DaVnky-A)
    echo -------------------------------------------------------------
    pause
    goto :eof
)

%PY% tools\sync-a.py %*
if "%~1"=="apply" pause
if "%~1"=="refresh" pause
