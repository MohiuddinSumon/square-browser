@echo off
rem One-click release build. Double-click, or pass args: release.bat -VersionName 1.1.0 -VersionCode 11
rem The AAB and APK end up in release\v<name>-<code>\
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
