@echo off
rem =====================================================================
rem  pull: double-click this (it's in the tools folder) to get the latest
rem  version of the site from Forgejo: whatever Mel (or anyone else) has
rem  pushed since you last published or pulled.
rem    - your own changes that aren't published yet stay as they are
rem    - if the same file was changed here AND on Forgejo, it keeps a
rem      copy of yours in _your-versions, then gets theirs: ask Claude
rem      to put the two together
rem  publish.bat does this too, first thing, so publishing never undoes
rem  anybody else's work.
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
echo  getting the latest version from Forgejo...
"%GITSH%" -c "tr -d '\r' < tools/pull.sh | sh"
echo.
pause
