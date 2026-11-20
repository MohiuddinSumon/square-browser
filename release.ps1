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

function Exit-WithError([string]$Message) {
    Write-Host "ERROR: $Message"
    Read-Host "Press Enter to exit"
    exit 1
}

# Asks a yes/no question; anything but y/yes stops the release.
function Confirm-OrExit([string]$Question) {
    $answer = Read-Host "$Question (y/N)"
    if ($answer -notmatch '^(y|yes)$') {
        Write-Host "Release cancelled."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# "1.0.9" -> [version] 1.0.9; $null when it is not a dotted number.
function ConvertTo-Version([string]$Name) {
    if ($Name -notmatch '^\d+(\.\d+){1,3}$') { return $null }
    return [version]$Name
}

# Current release, from app.json (the version source Expo uses)
$currentJson = Get-Content (Resolve-Path "app.json") -Raw | ConvertFrom-Json
$currentName = [string]$currentJson.expo.version
$currentCode = [int]$currentJson.expo.android.versionCode

# Next release: last part of the version name + 1 (1.0.9 -> 1.0.10), version code + 1
$nameParts = $currentName.Split('.')
$nameParts[-1] = [string]([int]$nameParts[-1] + 1)
$suggestedName = $nameParts -join '.'
$suggestedCode = $currentCode + 1

Write-Host "Current release : $currentName (code $currentCode)"
Write-Host "Next release    : $suggestedName (code $suggestedCode)"
Write-Host ""

if (-not $VersionName) {
    $VersionName = Read-Host "Enter version name, or press Enter for $suggestedName"
    if (-not $VersionName) { $VersionName = $suggestedName }
}
if (-not $VersionCode) {
    $VersionCode = Read-Host "Enter version code, or press Enter for $suggestedCode"
    if (-not $VersionCode) { $VersionCode = [string]$suggestedCode }
}

if ($VersionCode -notmatch '^\d+$') { Exit-WithError "Version code must be a number." }
$newName = ConvertTo-Version $VersionName
if (-not $newName) { Exit-WithError "Version name must look like 1.0.10." }

$codeInt = [int]$VersionCode
$oldName = ConvertTo-Version $currentName

# Building the same release again, or going backwards, needs a yes.
if ($codeInt -eq $currentCode) {
    Write-Host ""
    Write-Host "WARNING: Version code $codeInt is the current release. Google Play rejects an upload with a version code it already has."
    Confirm-OrExit "Build version code $codeInt again?"
} elseif ($codeInt -lt $currentCode) {
    Write-Host ""
    Write-Host "WARNING: Version code $codeInt is LOWER than the current release ($currentCode). Google Play only accepts higher version codes."
    Confirm-OrExit "Build with the lower version code $codeInt?"
}
if ($oldName -and $newName -eq $oldName) {
    Write-Host ""
    Write-Host "WARNING: Version name $VersionName is the current release."
    Confirm-OrExit "Build version $VersionName again?"
} elseif ($oldName -and $newName -lt $oldName) {
    Write-Host ""
    Write-Host "WARNING: Version name $VersionName is LOWER than the current release ($currentName)."
    Confirm-OrExit "Build with the lower version $VersionName?"
}

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

Write-Host ""
Write-Host "============================================"
Write-Host " Build complete!"
Write-Host "============================================"
Write-Host " Version : $VersionName (code $codeInt)"
Write-Host " AAB     : android\app\build\outputs\bundle\release\app-release.aab"
Write-Host " APK     : android\app\build\outputs\apk\release\app-release.apk"
Write-Host "============================================"
Write-Host ""
Read-Host "Press Enter to exit"
