# How to Build APK for SquareBrowser

## Step 1: Install Android Studio

1. Download Android Studio from: https://developer.android.com/studio
2. Install it with default settings
3. Open Android Studio and let it complete the setup wizard
4. It will automatically download the Android SDK

## Step 2: Find Your Android SDK Location

1. Open Android Studio
2. Go to **File → Settings** (or **Android Studio → Preferences** on Mac)
3. Navigate to **Appearance & Behavior → System Settings → Android SDK**
4. Look at the "Android SDK Location" path at the top
   - **Windows**: Usually `C:\Users\YourUsername\AppData\Local\Android\Sdk`
   - **Mac/Linux**: Usually `~/Library/Android/sdk` or `~/Android/Sdk`

## Step 3: Configure SDK Location

### Option A: Create local.properties file (Recommended)

1. Open the file `android/local.properties` in this project
2. Add this line (replace with your actual SDK path):
   ```
   sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
   ```
   **Note**: Use double backslashes (`\\`) on Windows, or forward slashes (`/`)

### Option B: Set Environment Variable

**Windows:**
1. Open System Properties → Environment Variables
2. Add new system variable:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
3. Add to Path: `%ANDROID_HOME%\platform-tools`

**Mac/Linux:**
Add to `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Step 4: Build the APK

Once the SDK is configured, run:

```bash
cd android
./gradlew assembleRelease
```

**On Windows (Git Bash):**
```bash
cd android
./gradlew assembleRelease
```

**On Windows (Command Prompt):**
```bash
cd android
gradlew.bat assembleRelease
```

## Step 5: Find Your APK

After the build completes successfully, your APK will be located at:

```
android/app/build/outputs/apk/release/app-release.apk
```

## Step 6: Install on Your Phone

### Method 1: Transfer via USB
1. Connect your phone to your computer via USB
2. Copy `app-release.apk` to your phone
3. On your phone, open the file manager
4. Tap the APK file to install
5. Allow installation from unknown sources if prompted

### Method 2: Transfer via Cloud/Email
1. Upload the APK to Google Drive, Dropbox, or email it to yourself
2. Download it on your phone
3. Open the downloaded file to install

### Method 3: Using ADB (Advanced)
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting

### "SDK location not found"
- Make sure you've created `android/local.properties` with the correct SDK path
- Or set the `ANDROID_HOME` environment variable
- Restart your terminal after setting environment variables

### "Build failed" errors
- Make sure Android Studio is installed and SDK is downloaded
- Try: `cd android && ./gradlew clean` then rebuild
- Check that you have Java JDK 17+ installed

### "Gradle daemon" issues
- Stop all Gradle daemons: `cd android && ./gradlew --stop`
- Then try building again

## Building a Signed APK (For Play Store)

If you want to publish to Google Play Store, you'll need to create a signed APK:

1. Generate a keystore (one-time):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore squarebrowser-release.keystore -alias squarebrowser-key -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Create `android/keystore.properties`:
   ```
   storePassword=your-store-password
   keyPassword=your-key-password
   keyAlias=squarebrowser-key
   storeFile=../squarebrowser-release.keystore
   ```

3. Update `android/app/build.gradle` to use signing config (see Android documentation)

4. Build signed APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## Quick Start (If you have Android Studio)

1. Open Android Studio
2. Click "Open" and select the `android` folder in this project
3. Wait for Gradle sync
4. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. Wait for build to complete
6. Click "locate" when the notification appears
7. The APK will be in `android/app/build/outputs/apk/debug/app-debug.apk` (debug) or `release/app-release.apk` (release)


