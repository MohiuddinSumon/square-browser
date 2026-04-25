# SquareBrowser

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-green.svg)](https://github.com/MohiuddinSumon/square-browser)

A privacy-focused mobile browser built with React Native and Expo, designed to promote mindful browsing through permanent, local-only history tracking.

## Features

- **Privacy First**: All browsing data (history, bookmarks, usage stats) is stored locally on your device. No external servers, no data collection, no tracking.
- **Accountability Focus**: Permanent browsing history encourages mindful internet usage. History cannot be deleted within the app.
- **Clean Interface**: Modern, intuitive UI with dark mode support.
- **Tab Management**: Multiple tabs support with easy switching.
- **Bookmarks**: Save your favorite sites for quick access.
- **Usage Statistics**: Track your browsing habits with daily usage stats.
- **Desktop Mode**: Toggle between mobile and desktop user agents.
- **Ad Blocking**: Built-in ad blocking capabilities.

## Screenshots

> **Note**: Add screenshots here showing the app interface, home screen, settings, etc.

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/MohiuddinSumon/square-browser.git
   cd SquareBrowser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For Android development, see [SETUP.md](SETUP.md) for detailed setup instructions.

4. Run the app:
   ```bash
   npm start
   ```

   Then press `a` for Android or `i` for iOS.

### Building for Android

See [BUILD_APK.md](BUILD_APK.md) for instructions on building a release APK.

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Expo CLI

### Project Structure

```
SquareBrowser/
├── components/          # Reusable UI components
│   ├── AddressBar.js
│   ├── HomeScreen.js
│   └── NavigationControls.js
├── context/             # React Context providers
│   └── BrowserContext.js
├── screens/             # Screen components
│   ├── BrowserScreen.js
│   ├── BookmarksScreen.js
│   ├── HistoryScreen.js
│   ├── SettingsScreen.js
│   ├── PrivacyPolicyScreen.js
│   └── TermsOfServiceScreen.js
├── utils/               # Utility functions
│   └── storage.js
├── assets/              # Images and icons
├── android/             # Android native code
└── App.js               # Main app component
```

### Running the Development Server

```bash
npm start
```

### Building for Production

#### Android

```bash
cd android
./gradlew bundleRelease
```

The AAB (Android App Bundle) will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Privacy Policy

SquareBrowser is committed to your privacy:

- **No Data Collection**: We do not collect, transmit, or store any of your browsing data on external servers.
- **Local Storage Only**: All history, bookmarks, and usage statistics are stored locally on your device using AsyncStorage.
- **No Tracking**: No analytics, no tracking, no telemetry.
- **Open Source**: The entire codebase is open source, so you can verify our privacy claims.

For more details, see the in-app Privacy Policy or view it in [screens/PrivacyPolicyScreen.js](screens/PrivacyPolicyScreen.js).

## Terms of Service

By using SquareBrowser, you acknowledge that:
- This is an accountability-focused tool with permanent history logging.
- History cannot be deleted within the app.
- No incognito/private mode is provided.
- The app is provided "as is" without warranties.

For full terms, see the in-app Terms of Service or view it in [screens/TermsOfServiceScreen.js](screens/TermsOfServiceScreen.js).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

See [`landing/docs/planned-features.md`](landing/docs/planned-features.md) for the full roadmap.

**In Progress**
- [ ] Weekly/monthly usage trend views and streak tracking
- [ ] Custom domain block lists
- [ ] Scheduled browsing windows (e.g., no browsing before 9am)
- [ ] Home screen timer widget

**Planned**
- [ ] iOS release (SwiftUI + WKWebView)
- [ ] Family/parental controls with supervised profiles
- [ ] Accountability partner — share usage summaries with a trusted contact
- [ ] Exportable usage reports (CSV/PDF)

## Support the Project

SquareBrowser is free, open source, and built by one person. If it's helped you reclaim time from the internet, consider giving back:

- ☕ **[Buy Me a Coffee](https://buymeacoffee.com/squarebrowser)** — one-time contribution, any amount
- ♡ **[GitHub Sponsors](https://github.com/sponsors/MohiuddinSumon)** — monthly support, cancel anytime
- ⭐ **[Star the repo](https://github.com/MohiuddinSumon/square-browser)** — free, helps with discoverability

Core accountability features stay free forever. Sponsorships help keep it that way.

## Help & Issues

- **Bugs / Feature requests**: [GitHub Issues](https://github.com/MohiuddinSumon/square-browser/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MohiuddinSumon/square-browser/discussions)

## Acknowledgments

- Built with [React Native](https://reactnative.dev/)
- Powered by [Expo](https://expo.dev/)
- Uses [react-native-webview](https://github.com/react-native-webview/react-native-webview) for web rendering

---

**Made with ❤️ for privacy-conscious users**
