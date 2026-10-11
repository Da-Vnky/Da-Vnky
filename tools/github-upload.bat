@echo off
rem =====================================================================
rem  github-upload: double-click this (it's in the tools folder) to put a
rem  copy of the site on GitHub, so Claude's cloud sessions
rem  (claude.ai/code) can work on it. Only while the credit lasts:
rem  Forgejo stays the site's real home.
rem    - the first time, make an EMPTY repository on GitHub (no README,
rem      no .gitignore, no licence) and paste its address when asked
rem    - it gets skizy's changes from Forgejo first, then sends everything
rem      you've published. Unpublished changes stay here; so does
rem      everything .gitignore keeps out (.inbox and the rest)
rem    - it never overwrites anything on GitHub
rem  After that, github-publish.bat brings Claude's approved changes here
rem  and publishes them. (tools/github-upload.sh does the work)
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

set "GITHUB_ADDR=%~1"
git remote get-url github >nul 2>nul
if errorlevel 1 if not defined GITHUB_ADDR (
    echo.
    echo  First, on github.com: "+" at the top right, "New repository". Name it ^(e.g. DaV-nky^),
    echo  Private is fine, and leave everything else off ^(no README, no .gitignore, no licence^).
    echo  Then copy its address from your browser.
    echo.
    set /p "GITHUB_ADDR=  its address (like https://github.com/your-name/DaV-nky), then Enter: "
)
"%GITSH%" -c "tr -d '\r' < tools/github-upload.sh | sh"
echo.
pause
