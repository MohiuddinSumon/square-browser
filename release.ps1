# Copyright (c) 2025 SquareBrowser Contributors

param(
    [string]$VersionName = "",
    [string]$VersionCode = ""
)

Set-Location $PSScriptRoot

Write-Host "============================================"
Write-Host " SquareBrowser Release Builder"
Write-Host "============================================"
Write-Host ""

if (-not $VersionName) { $VersionName = Read-Host "Enter version name (e.g. 1.0.8)" }
if (-not $VersionCode) { $VersionCode = Read-Host "Enter version code (e.g. 8)" }

if (-not $VersionName) { Write-Host "ERROR: Version name cannot be empty."; Read-Host "Press Enter to exit"; exit 1 }
if (-not $VersionCode) { Write-Host "ERROR: Version code cannot be empty."; Read-Host "Press Enter to exit"; exit 1 }
if ($VersionCode -notmatch '^\d+$') { Write-Host "ERROR: Version code must be a number."; Read-Host "Press Enter to exit"; exit 1 }

$codeInt = [int]$VersionCode

Write-Host ""
Write-Host "Updating to version $VersionName (code $codeInt)..."
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# 1. android/app/build.gradle (not JSON — use targeted line replacement)
Write-Host "[1/3] Updating android\app\build.gradle..."
$gradlePath = Resolve-Path "android\app\build.gradle"
$lines = [System.IO.File]::ReadAllLines($gradlePath)
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s*versionCode \d+$') {
        $lines[$i] = $lines[$i] -replace 'versionCode \d+', "versionCode $codeInt"
    } elseif ($lines[$i] -match '^\s*versionName "') {
        $lines[$i] = $lines[$i] -replace 'versionName "[^"]+"', "versionName `"$VersionName`""
    }
}
[System.IO.File]::WriteAllLines($gradlePath, $lines, $utf8NoBom)
Write-Host "   Done."

# 2. app.json (parse as JSON, set fields, write back)
Write-Host "[2/3] Updating app.json..."
$appJsonPath = Resolve-Path "app.json"
$appJson = Get-Content $appJsonPath -Raw | ConvertFrom-Json
$appJson.expo.version = $VersionName
$appJson.expo.android.versionCode = $codeInt
$appJsonOut = $appJson | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($appJsonPath, $appJsonOut, $utf8NoBom)
Write-Host "   Done."

# 3. package.json (parse as JSON, set version, write back)
Write-Host "[3/3] Updating package.json..."
$pkgJsonPath = Resolve-Path "package.json"
$pkgJson = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
$pkgJson.version = $VersionName
$pkgJsonOut = $pkgJson | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($pkgJsonPath, $pkgJsonOut, $utf8NoBom)
Write-Host "   Done."

Write-Host ""
Write-Host "============================================"
Write-Host " Pre-build checks..."
Write-Host "============================================"
Write-Host ""

Write-Host "Checking Node.js..."
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Host "ERROR: 'node' not found in PATH."
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "   Found: $nodePath"

Write-Host "Running npm install..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed."
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "   Done."

Write-Host ""
Write-Host "============================================"
Write-Host " Building release..."
Write-Host "============================================"
Write-Host ""

Set-Location android

Write-Host "Running bundleRelease..."
& .\gradlew.bat bundleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: bundleRelease failed."
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Running assembleRelease..."
& .\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: assembleRelease failed."
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location ..

# ---- Collect the build into release\v<name>-<code>\ ----------------------------
Write-Host ""
Write-Host "============================================"
Write-Host " Collecting files..."
Write-Host "============================================"
Write-Host ""

$builtAab = "android\app\build\outputs\bundle\release\app-release.aab"
$builtApk = "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $builtAab)) { Write-Host "ERROR: Expected $builtAab was not produced."; Read-Host "Press Enter to exit"; exit 1 }
if (-not (Test-Path $builtApk)) { Write-Host "ERROR: Expected $builtApk was not produced."; Read-Host "Press Enter to exit"; exit 1 }

# Play rejects a debug-signed bundle (happens when keystore.properties is missing at prebuild).
if (Get-Command keytool -ErrorAction SilentlyContinue) {
    $cert = (& keytool -printcert -jarfile $builtAab | Out-String)
    if ($cert -match 'Android Debug' -or $cert -notmatch 'SHA256') {
        Write-Host "ERROR: The bundle is debug-signed or unsigned. Check keystore.properties and run 'npx expo prebuild --clean'." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    $cert -split "`r?`n" | Where-Object { $_ -match 'Owner|SHA256' } | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   WARNING: keytool not on PATH, skipping the signature check." -ForegroundColor Yellow
}

$out = Join-Path $PSScriptRoot "release\v$VersionName-$codeInt"
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null
$base = "squarebrowser-$VersionName-$codeInt"
Copy-Item $builtAab (Join-Path $out "$base.aab")
Copy-Item $builtApk (Join-Path $out "$base.apk")
Write-Host "   Copied to $out" -ForegroundColor Green

Write-Host ""
Write-Host "============================================"
Write-Host " Build complete!"
Write-Host "============================================"
Write-Host " Version : $VersionName (code $codeInt)"
Write-Host " Folder  : $out"
Write-Host " AAB     : $base.aab  (upload to Play Console)"
Write-Host " APK     : $base.apk  (sideload / testing)"
Write-Host "============================================"
Start-Process explorer.exe $out
Write-Host ""
Read-Host "Press Enter to exit"
