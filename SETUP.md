# OpenBrowser - Setup Guide

## Prerequisites

To build and run the Android app, you need:

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Android SDK** - Installed via Android Studio
3. **Java Development Kit (JDK)** - Version 17 or higher

## Android SDK Setup

### Step 1: Install Android Studio

1. Download and install Android Studio from the official website
2. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

### Step 2: Set Environment Variables

**Windows:**

1. Open System Properties → Environment Variables
2. Add new system variable:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YourUsername\AppData\Local\Android\Sdk` (or your SDK location)
3. Add to Path:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

**To find your SDK location:**

- Open Android Studio
- Go to File → Settings → Appearance & Behavior → System Settings → Android SDK
- Copy the "Android SDK Location" path

### Step 3: Create an Android Virtual Device (AVD)

1. Open Android Studio
2. Go to Tools → Device Manager
3. Click "Create Device"
4. Select a device (e.g., Pixel 5)
5. Select a system image (e.g., Android 13 - API 33)
6. Click "Finish"

### Step 4: Verify Setup

Open a new terminal and run:

```bash
adb devices
```

You should see your device or emulator listed.

## Running the App

### Option 1: Using Expo Development Build

1. Start the Expo development server:

   ```bash
   npm start
   ```

2. In another terminal, build and run on Android:
   ```bash
   npx expo run:android
   ```

### Option 2: Using Android Studio

1. Open Android Studio
2. Open the `android` folder in this project
3. Wait for Gradle sync to complete
4. Click the "Run" button or press Shift+F10

### Option 3: Build APK for Installation

1. Build the APK:

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. Find the APK at: `android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### Android SDK Not Found

- Verify `ANDROID_HOME` environment variable is set correctly
- Restart your terminal/IDE after setting environment variables
- Check that the SDK path exists on your system

### No Device Found

- Make sure an emulator is running (start from Android Studio Device Manager)
- Or connect a physical device with USB debugging enabled
- Run `adb devices` to verify connection

### Build Errors

- Make sure you've run `npx expo prebuild` first
- Clean build: `cd android && ./gradlew clean`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Development Notes

- This app uses `react-native-webview` which requires native code
- You cannot use Expo Go - you must build a development build
- The app has been prebuilt - native code is in the `android/` folder
