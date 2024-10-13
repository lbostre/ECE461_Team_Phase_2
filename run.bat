@echo off
setlocal enabledelayedexpansion

rem Main script
if "%1"=="install" (
    call npm init -y
    if %errorlevel% neq 0 (
        echo npm init failed
        exit /b 1
    )

    call npm install typescript --save-dev
    if %errorlevel% neq 0 (
        echo npm install typescript failed
        exit /b 1
    )

    call npm install @types/node --save-dev
    if %errorlevel% neq 0 (
        echo npm install @types/node failed
        exit /b 1
    )

    call npm install fs --save-dev
    if %errorlevel% neq 0 (
        echo npm install fs failed
        exit /b 1
    )

    call npm install axios --save-dev
    if %errorlevel% neq 0 (
        echo npm install axios failed
        exit /b 1
    )

    call npm install dotenv --save-dev
    if %errorlevel% neq 0 (
        echo npm install dotenv failed
        exit /b 1
    )

    call npm install simple-git --save-dev
    if %errorlevel% neq 0 (
        echo npm install simple-git failed
        exit /b 1
    )

    exit /b 0
) else if "%1"=="test" (
    echo Testing...
    rem Add your test command here when ready
    exit /b 0
) else (
    if "%1"=="" (
        echo Usage: %0 ^{install^|test^|url_file_path^}
        exit /b 1
    )

    rem Check if %1 is a valid file path and ends with .txt
    if not exist "%1" (
        echo File path "%1" does not exist.
        exit /b 1
    )

    rem Compile the TypeScript file
    call npx tsc cli.ts
    if %errorlevel% neq 0 (
        echo TypeScript compilation failed.
        exit /b 1
    )

    rd /s /q cloned_repo 2>nul
    del /q output.json 2>nul

    rem Run the compiled JS file with the given URL file path
    call node cli.js "%1"
    if %errorlevel% neq 0 (
        echo Failed to execute cli.js.
        exit /b 1
    )

    rem Output the contents of output.json to the command line
    if exist output.json (
        type output.json
    ) else (
        echo output.json not found.
        exit /b 1
    )

    exit /b 0
)