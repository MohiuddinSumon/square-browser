# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SquareBrowser is a privacy-focused mobile browser built with React Native and Expo. The core philosophy is **accountability through permanent, local-only history tracking**. All browsing data is stored locally on the device with no external servers or data collection.

## Development Commands

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android device/emulator
npm run android

# Run on iOS simulator (macOS only)
npm run ios

# Build for web
npm run web

# Build release APK/AAB for Android
cd android && ./gradlew bundleRelease
```

**Note**: Android SDK setup is required. See `SETUP.md` for detailed Android development setup instructions.

## Architecture Overview

### Technology Stack
- **Frontend**: React Native 0.81.5 with React 19.1.0
- **Platform**: Expo ~54.0.30 with Expo Dev Client
- **Navigation**: React Navigation v7 (Stack for screens, custom bottom nav for main controls)
- **Storage**: AsyncStorage for local data persistence
- **Web Rendering**: react-native-webview 13.16.0

### Core Design Principles

1. **Privacy-First**: No external API calls, no analytics, no tracking. All data is local-only.
2. **Accountability**: Permanent browsing history that cannot be deleted within the app.
3. **Tab State Management**: Each tab maintains its own WebView instance for proper navigation history persistence.

### Directory Structure

```
SquareBrowser/
├── App.js                    # Main entry point, navigation setup, URL handling
├── context/BrowserContext.js # Global state management (tabs, history, bookmarks, settings)
├── components/               # Reusable UI components
│   ├── AddressBar.js        # URL input with navigation controls
│   ├── HomeScreen.js        # Home screen with quick actions
│   └── NavigationControls.js # Browser control buttons
├── screens/                  # Screen components
│   ├── BrowserScreen.js     # Main browsing interface with tab management
│   ├── BookmarksScreen.js   # Bookmark management
│   ├── HistoryScreen.js     # Permanent browsing history (read-only)
│   └── SettingsScreen.js    # App settings and preferences
└── utils/storage.js          # AsyncStorage helpers for persistence
```

## Key Architecture Patterns

### State Management: BrowserContext

The `BrowserContext` (context/BrowserContext.js) is the single source of truth for all app state:

- **Tabs**: Array of tab objects with URL, navigation state, and unique IDs
- **History**: Append-only permanent history stored in AsyncStorage
- **Bookmarks**: User-managed saved URLs
- **Usage Stats**: Time tracking per domain for insights
- **Settings**: Theme, exit confirmation, desktop mode, ad blocking

**Important**: Always use the `useBrowser()` hook to access browser state. Direct AsyncStorage manipulation outside of `utils/storage.js` is discouraged.

### Tab Management Architecture

Each tab maintains its own WebView instance to preserve navigation history. Key implementation details in `BrowserScreen.js`:

- `BrowserTab` component encapsulates a single tab's WebView logic
- Tabs are rendered in a list with only the active tab visible (`display: isActive ? 'flex' : 'none'`)
- The active tab's WebView ref is registered globally for navigation controls (back/forward/refresh)
- When closing the last tab, it resets to `about:blank` instead of closing completely

**Critical**: Never unmount a non-active tab's WebView - this breaks navigation history. The conditional display approach preserves all tab states.

### URL Handling

The app handles deep linking from external apps via `expo-linking` in `App.js`:
- `UrlHandler` component processes incoming URLs
- URLs without protocols are auto-detected (domains get `https://`, search queries go to Google)
- Navigation updates both the active tab's state and triggers WebView loads

### Data Persistence (utils/storage.js)

All data is stored locally using AsyncStorage with consistent prefixes:
- `@squarebrowser_history_` - History entries (append-only)
- `@squarebrowser_bookmarks_` - Bookmark entries
- `@squarebrowser_usage_` - Daily usage statistics per domain
- `@squarebrowser_theme` - Dark/light mode preference
- `@squarebrowser_exit_confirm` - Exit confirmation setting

## Important Constraints

### Permanent History
History is **append-only by design**. The `addHistoryEntry()` function in BrowserContext only adds entries - there is no delete function. This is intentional for the accountability feature.

### User Agent Switching
Two user agents are defined in BrowserContext:
- `MOBILE_UA`: iOS or Android mobile user agent
- `DESKTOP_UA`: Chrome desktop user agent

The `userAgent` is passed to all WebView instances and affects how websites render.

### Ad Blocking
Basic ad blocking is implemented via injected JavaScript that removes common ad selectors. This runs on page load and after 2 seconds.

## File-Specific Notes

### App.js
- Contains `CustomBottomNav` component (home, tabs with badge count, settings)
- `UrlHandler` manages deep linking for opening external URLs
- Stack Navigator setup with all screen routes

### BrowserScreen.js
- Largest and most complex file - handles multi-tab WebView orchestration
- `BrowserTab` component: Single tab encapsulation with WebView persistence
- `ExitModal`: Exit confirmation with "don't ask again" option
- `TabSwitcher`: Modal grid view for switching between tabs
- Android hardware back button handling with custom logic

### BrowserContext.js
- Tracks user activity time via `activityTracker` ref (startTime, currentUrl, lastSaved)
- Records usage when URL changes or app goes to background
- `navigateTo()` function formats URLs (adds protocol, converts searches)

## Build and Release

### Android
- Package name: `com.squarebrowser.app`
- Production signing configured in `android/app/build.gradle`
- Version info must match between `app.json` and `package.json`
- Use Expo Dev Client for development builds

### Version Management
When updating versions:
1. Update `version` in `package.json`
2. Update `version` and `versionCode` in `app.json`
3. Update `android/app/build.gradle` if manually versioning

## Git Commits

- Never include "Claude" or any AI assistant reference in commit messages or co-author tags

## Code Style

- Copyright headers in all source files: `Copyright (c) 2025 SquareBrowser Contributors`
- Uses `@expo/vector-icons` (Ionicons) for all icons
- Platform-specific code uses `Platform.OS` with `ios`/`android`/`web` checks
- Dark mode support via `isDarkMode` state from BrowserContext
