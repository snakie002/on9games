@echo off
setlocal enabledelayedexpansion

for /d %%F in (*) do (
    set "folder=%%F"
    set "newfolder=!folder: =_!"
    if not "!folder!"=="!newfolder!" ren "%%F" "!newfolder!"
)

echo Done!