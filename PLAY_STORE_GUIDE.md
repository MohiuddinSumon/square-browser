# Google Play Store Publishing Guide

This guide will help you prepare OpenBrowser for publication on the Google Play Store.

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
keyAlias=openbrowser-key
storeFile=../openbrowser-release.keystore
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

4. **Short Description**: 80 characters max
   ```
   Privacy-focused mobile browser with permanent history tracking for mindful browsing.
   ```

5. **Full Description**: 4000 characters max
   ```
   OpenBrowser - Privacy-First Mobile Browser

   OpenBrowser is a privacy-focused mobile browser designed to promote mindful internet usage through permanent, local-only history tracking.

   KEY FEATURES:

   🔒 Privacy First
   • All data stored locally on your device
   • No external servers, no data collection
   • No tracking, analytics, or telemetry
   • Open source - verify our privacy claims

   📊 Accountability Focus
   • Permanent browsing history (cannot be deleted)
   • Encourages mindful internet usage
   • Daily usage statistics
   • No incognito/private mode

   🎨 Modern Interface
   • Clean, intuitive design
   • Dark mode support
   • Smooth navigation
   • Tab management

   ⚡ Powerful Features
   • Multiple tabs support
   • Bookmarks management
   • Desktop mode toggle
   • Built-in ad blocking
   • Usage statistics

   WHY OPENBROWSER?

   In an age of constant tracking and data collection, OpenBrowser puts you in control. All your browsing data stays on your device - we don't collect, transmit, or store anything on external servers.

   Perfect for:
   • Privacy-conscious users
   • Those seeking accountability in their browsing habits
   • Anyone who wants full control over their data
   • Users who value transparency (open source)

   OpenBrowser is completely open source. You can review the code, verify our privacy claims, and even contribute to the project.

   Download OpenBrowser today and take control of your browsing experience.
   ```

### App Information

- **App Name**: OpenBrowser
- **Category**: Tools or Productivity
- **Content Rating**: Complete the questionnaire in Play Console
- **Privacy Policy URL**: 
  - Host your Privacy Policy online (GitHub Pages, website, etc.)
  - Or use: `https://github.com/MohiuddinSumon/open-browser/blob/main/screens/PrivacyPolicyScreen.js`
- **Terms of Service URL**: Same as Privacy Policy
- **Support Email**: Your support email address
- **Website**: Optional (GitHub repo URL works)

## Step 4: Data Safety Section

In Play Console, complete the Data Safety section:

1. **Data Collection**: 
   - Select "No, we don't collect any user data"
   - This is accurate for OpenBrowser

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
