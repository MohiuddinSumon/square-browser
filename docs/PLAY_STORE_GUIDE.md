# Google Play Store Publishing Guide

This guide will help you prepare SquareBrowser for publication on the Google Play Store.

## Prerequisites

1. **Google Play Developer Account**
   - Sign up at https://play.google.com/console
   - One-time registration fee: $25 USD
   - Complete account verification

2. **Production Keystore**
   - Required for signing release builds
   - **IMPORTANT**: Keep this secure and backed up!

## Step 1: Generate Production Keystore

### Generate the Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore openbrowser-release.keystore -alias openbrowser-key -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- Keystore password (save this securely!)
- Key password (can be same as keystore password)
- Your name and organization details

**CRITICAL**: 
- Store the keystore file securely (NOT in the repository)
- Back up the keystore to multiple secure locations
- Document the passwords in a secure password manager
- If you lose the keystore, you cannot update your app on Play Store!

### Create keystore.properties

Create `android/keystore.properties` (this file is gitignored):

```properties
storePassword=your-store-password-here
keyPassword=your-key-password-here
keyAlias=squarebrowser-key
storeFile=../squarebrowser-release.keystore
```

**Note**: The `storeFile` path is relative to the `android/` directory.

## Step 2: Build Release AAB

Build the Android App Bundle (AAB) for Play Store:

```bash
cd android
./gradlew bundleRelease
```

The AAB will be located at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Step 3: Prepare Store Listing

### Required Assets

1. **App Icon**: 512x512px PNG
   - Location: `assets/icon.png`
   - Verify it's exactly 512x512px

2. **Feature Graphic**: 1024x500px PNG
   - Create a banner showcasing your app
   - Should be visually appealing and represent the app

3. **Screenshots**: 
   - Phone: At least 2, up to 8 screenshots
   - Recommended size: 1080x1920px (or similar 9:16 ratio)
   - Show key features: home screen, browsing, settings, dark mode

4. **Short Description**: 80 characters max (plain text only, Play does not render markdown)
   ```
   Browser with permanent history, daily time limits and Strict Mode. No ads.
   ```
   (75 chars. Alternative: "Accountability browser: permanent history, daily limits, Strict Mode. No ads.")

5. **Full Description**: 4000 characters max. Plain text only: Play does not render markdown (`**bold**` shows as literal asterisks). Do not add keyword lists, hashtags or "keywords for SEO" blocks; Play's metadata policy treats them as keyword stuffing and can reject or suspend the listing. Use keywords naturally in sentences.
   ```
   Square Browser is an accountability browser for Android. It keeps an honest, permanent record of where you browse, limits how long you can spend online each day, and keeps everything on your phone.

   WHAT MAKES IT DIFFERENT

   Permanent history
   Your history cannot be deleted inside the app and there is no incognito mode. Knowing the record is always there helps you browse with intention.

   Daily time limit
   Set how many minutes you want to spend browsing each day. When the limit is reached, the browser stops you.

   Strict Mode
   When the daily limit is reached, Strict Mode locks you out completely instead of letting you dismiss the warning.

   Usage stats
   See how much time you spend on each site, day by day.

   PRIVATE BY DESIGN
   - Everything stays on your device. No account, no servers, no analytics, no tracking.
   - Built-in ad, pop-up and tracker blocking that works offline.
   - The code is open source, so you can check these claims yourself.

   EVERYDAY BROWSING
   - Multiple tabs, bookmarks and a clean home screen
   - Dark mode
   - Desktop site mode
   - Open links in other apps, with a prompt before leaving the browser
   - Keep audio playing in the background with notification controls
   - Fullscreen video with landscape rotation

   WHO IT IS FOR
   People who want to cut down on screen time, build healthier browsing habits, or hold themselves accountable, without handing their data to anyone.

   Questions or feedback? Visit https://squarebrowser.com or open an issue on GitHub.
   ```

   Store listing tips (from the October 2026 audit):
   - Title: consider a keyword title such as "Square Browser: Focus & Limits" (30 chars max).
   - Lead every screenshot with a short benefit caption ("History you can't delete", "Daily limit lock", "Usage stats per site", "Strict Mode", "Ad blocker", "No data collected"). Keep them all portrait and the same style; leave out blank settings screens.
   - Never describe the SDK, framework or storage engine in the listing.
   - Write a real "What's new" for each release (see CHANGELOG.md).
   - Add a Bengali (bn-BD) listing: translate the title, both descriptions and the screenshot captions.

### App Information

- **App Name**: SquareBrowser
- **Category**: Tools or Productivity
- **Content Rating**: Complete the questionnaire in Play Console
- **Privacy Policy URL**: 
  - Host your Privacy Policy online (GitHub Pages, website, etc.)
  - Or use: `https://github.com/MohiuddinSumon/square-browser/blob/main/screens/PrivacyPolicyScreen.js`
- **Terms of Service URL**: Same as Privacy Policy
- **Support Email**: Your support email address
- **Website**: Optional (GitHub repo URL works)

## Step 4: Data Safety Section

In Play Console, complete the Data Safety section:

1. **Data Collection**: 
   - Select "No, we don't collect any user data"
   - This is accurate for SquareBrowser

2. **Data Sharing**:
   - Select "No, we don't share user data"

3. **Security Practices**:
   - Data encryption in transit: Not applicable (no data transmission)
   - Data encryption at rest: Yes (local device storage)

## Step 5: Upload to Play Console

1. Go to https://play.google.com/console
2. Create a new app
3. Fill in all required information
4. Upload the AAB file
5. Complete store listing
6. Set pricing (Free)
7. Submit for review

## Step 6: Testing

Before submitting:

- [ ] Test the release AAB on multiple devices
- [ ] Test all core features
- [ ] Test light and dark modes
- [ ] Verify no crashes or errors
- [ ] Check that Privacy Policy and Terms are accessible

## Version Management

When updating the app:

1. Update version in `app.json`:
   ```json
   "version": "1.0.1"
   ```

2. Update version in `android/app/build.gradle`:
   ```gradle
   versionCode 2
   versionName "1.0.1"
   ```

3. Update `CHANGELOG.md`

4. Build new AAB and upload to Play Console

## Troubleshooting

### "Keystore file not found"
- Ensure `keystore.properties` exists in `android/` directory
- Check that the `storeFile` path in `keystore.properties` is correct

### "Signing config not found"
- Make sure `keystore.properties` is properly formatted
- Verify all required fields are present

### Build fails
- Clean build: `cd android && ./gradlew clean`
- Ensure all dependencies are installed: `npm install`
- Check that Android SDK is properly configured

## Security Reminders

- **NEVER** commit `keystore.properties` or `*.keystore` files to git
- **ALWAYS** back up your production keystore
- Store keystore passwords securely
- If keystore is lost, you cannot update your app - you'll need to create a new Play Store listing

## Additional Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [React Native Signing Guide](https://reactnative.dev/docs/signed-apk-android)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)
