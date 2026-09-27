@echo off
rem =====================================================================
rem  merge-prs: double-click this (it's in the tools folder) to merge
rem  pull requests from Forgejo (Mel's) when Forgejo's own merge button
rem  won't, because both sides rewrote the lists (catalog.txt, files.txt,
rem  manifest.txt ...). It merges them here, writes the lists again,
rem  and publishes. It asks which pull requests (their numbers).
rem  It stops, changing nothing, if anything real clashes.
rem =====================================================================
cd /d "%~dp0.."
set "GITSH="
if exist "%ProgramFiles%\Git\bin\sh.exe" set "GITSH=%ProgramFiles%\Git\bin\sh.exe"
if not defined GITSH if exist "%ProgramFiles(x86)%\Git\bin\sh.exe" set "GITSH=%ProgramFiles(x86)%\Git\bin\sh.exe"
if not defined GITSH if exist "%LocalAppData%\Programs\Git\bin\sh.exe" set "GITSH=%LocalAppData%\Programs\Git\bin\sh.exe"
if not defined GITSH (
    echo Couldn't find Git's sh.exe. Is Git for Windows installed?
    pause
    goto :eof
)

echo.
set /p "PRS=Which pull requests? Their numbers, oldest first (e.g. 7 8 9 10): "
if "%PRS%"=="" goto :eof
echo.
"%GITSH%" -c "tr -d '\r' < tools/merge-prs.sh | sh -s -- %PRS%"
echo.
pause
