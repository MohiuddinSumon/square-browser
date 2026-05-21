@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  SquareBrowser Release Builder
echo ============================================
echo.

:: Prompt for version name
set /p VERSION_NAME=Enter version name (e.g. 1.0.8):
if "!VERSION_NAME!"=="" (
    echo ERROR: Version name cannot be empty.
    exit /b 1
)

:: Prompt for version code
set /p VERSION_CODE=Enter version code (e.g. 8):
if "!VERSION_CODE!"=="" (
    echo ERROR: Version code cannot be empty.
    exit /b 1
)

:: Validate version code is a number
set "VALID=true"
for /f "delims=0123456789" %%i in ("!VERSION_CODE!") do set "VALID=false"
if "!VALID!"=="false" (
    echo ERROR: Version code must be a number.
    exit /b 1
)

echo.
echo Updating versions to: !VERSION_NAME! ^(code !VERSION_CODE!^)
echo.

:: --- Update android/app/build.gradle ---
echo [1/3] Updating android/app/build.gradle...
set "GRADLE=android\app\build.gradle"
set "GRADLE_TMP=%GRADLE%.tmp"

(for /f "tokens=1* delims=:" %%a in ('findstr /n "^" "%GRADLE%"') do (
    set "LINE=%%b"
    echo !LINE! | findstr /r "^        versionCode [0-9]*$" >nul
    if !errorlevel!==0 (
        echo         versionCode !VERSION_CODE!
    ) else (
        echo !LINE! | findstr /r "^        versionName " >nul
        if !errorlevel!==0 (
            echo         versionName "!VERSION_NAME!"
        ) else (
            echo !LINE!
        )
    )
)) > "%GRADLE_TMP%"
move /y "%GRADLE_TMP%" "%GRADLE%" >nul
echo    Done.

:: --- Update app.json ---
echo [2/3] Updating app.json...
set "APPJSON=app.json"
set "APPJSON_TMP=%APPJSON%.tmp"

(for /f "tokens=1* delims=:" %%a in ('findstr /n "^" "%APPJSON%"') do (
    set "LINE=%%b"
    echo !LINE! | findstr /r "\"versionCode\": [0-9]*" >nul
    if !errorlevel!==0 (
        echo       "versionCode": !VERSION_CODE!,
    ) else (
        echo !LINE! | findstr /r "^    \"version\": " >nul
        if !errorlevel!==0 (
            echo     "version": "!VERSION_NAME!",
        ) else (
            echo !LINE!
        )
    )
)) > "%APPJSON_TMP%"
move /y "%APPJSON_TMP%" "%APPJSON%" >nul
echo    Done.

:: --- Update package.json ---
echo [3/3] Updating package.json...
set "PKGJSON=package.json"
set "PKGJSON_TMP=%PKGJSON%.tmp"

(for /f "tokens=1* delims=:" %%a in ('findstr /n "^" "%PKGJSON%"') do (
    set "LINE=%%b"
    echo !LINE! | findstr /r "^  \"version\": " >nul
    if !errorlevel!==0 (
        echo   "version": "!VERSION_NAME!",
    ) else (
        echo !LINE!
    )
)) > "%PKGJSON_TMP%"
move /y "%PKGJSON_TMP%" "%PKGJSON%" >nul
echo    Done.

echo.
echo ============================================
echo  Building release...
echo ============================================
echo.

cd android

echo Running bundleRelease...
call gradlew.bat bundleRelease
if !errorlevel! neq 0 (
    echo ERROR: bundleRelease failed.
    cd ..
    exit /b 1
)

echo.
echo Running assembleRelease...
call gradlew.bat assembleRelease
if !errorlevel! neq 0 (
    echo ERROR: assembleRelease failed.
    cd ..
    exit /b 1
)

cd ..

echo.
echo ============================================
echo  Build complete!
echo ============================================
echo  Version: !VERSION_NAME! (code !VERSION_CODE!)
echo  AAB: android\app\build\outputs\bundle\release\app-release.aab
echo  APK: android\app\build\outputs\apk\release\app-release.apk
echo ============================================

endlocal
