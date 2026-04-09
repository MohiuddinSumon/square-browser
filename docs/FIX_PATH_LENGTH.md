# Fix Windows Path Length Issue

The build is failing because Windows has a 260 character path limit, and your project path is too long.

## Solution 1: Enable Windows Long Path Support (Recommended)

This allows Windows to support paths longer than 260 characters.

### Steps:

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run this command:**
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

3. **Restart your computer**

4. **Verify it worked:**
   ```powershell
   Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled"
   ```
   Should return `1`

5. **Try building again:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

## Solution 2: Move Project to Shorter Path (Quick Fix)

Move your project to a shorter path:

1. **Move the project folder:**
   - From: `F:\Users\Mohiuddin Sumon\Desktop\Client Work\Sumon\OpenBrowser`
   - To: `F:\OpenBrowser` or `C:\OpenBrowser`

2. **Update any absolute paths in your IDE/terminal**

3. **Try building again:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

## Solution 3: Use Gradle Build Cache (Already Configured)

I've already added a configuration to use a shorter build cache directory. Try:

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

If it still fails, use Solution 1 or 2.

## Why This Happens

Windows has a legacy 260 character path limit. When building React Native apps, the intermediate build files create very long paths like:
```
F:\Users\Mohiuddin Sumon\Desktop\Client Work\Sumon\OpenBrowser\android\app\.cxx\RelWithDebInfo\2b1p2l4g\arm64-v8a\safeareacontext_autolinked_build\CMakeFiles\...
```

This easily exceeds 260 characters, causing the build to fail.

## After Fixing

Once you've enabled long path support or moved the project, the build should work. The APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```


