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
- **Frontend**: React Native 0.86 with React 19.2
- **Platform**: Expo SDK 57 with Expo Dev Client
- **Navigation**: React Navigation v7 (Stack for screens, custom bottom nav for main controls)
- **Storage**: AsyncStorage for local data persistence
- **Web Rendering**: SquareBrowser's own WebView module on Android (`modules/square-webview`); react-native-webview 13.16 on iOS and as the Android "classic" fallback

### Core Design Principles

1. **Privacy-First**: No external API calls, no analytics, no tracking. All data is local-only.
2. **Accountability**: Permanent browsing history that cannot be deleted within the app.
3. **Tab State Management**: Each tab maintains its own WebView instance for proper navigation history persistence.

### Directory Structure

```
SquareBrowser/
├── App.js                    # Main entry point, navigation setup, URL handling
├── context/BrowserContext.js # Global state management (tabs, history, bookmarks, settings)
├── i18n/                     # Translations (en.js is the source; ru.js, pl.js, de.js, bn.js)
├── components/               # Reusable UI components
│   ├── AddressBar.js        # URL input with navigation controls
│   ├── HomeScreen.js        # Home screen with quick actions
│   ├── NavigationControls.js # Browser control buttons
│   ├── ProtectionGate.js    # PIN / 24-hour-wait prompt for accountability changes
│   └── ScreenHeader.js      # The one header all stack screens use (safe-area aware)
├── screens/                  # Screen components
│   ├── BrowserScreen.js     # Main browsing interface with tab management
│   ├── BookmarksScreen.js   # Bookmark management
│   ├── HistoryScreen.js     # Permanent browsing history (read-only)
│   ├── AccountabilityScreen.js # Schedules, block list, SafeSearch, commitment lock, weekly summary
│   └── SettingsScreen.js    # App settings and preferences
└── utils/
    ├── storage.js            # AsyncStorage helpers for persistence
    ├── url.js                # Address-bar input -> URL, search engines
    ├── protection.js         # Rules for schedules, block list, SafeSearch, commitment lock
    ├── adultDomains.js       # Curated adult-site list (opt-in filter)
    └── exportData.js         # History/bookmark export + import, weekly summary text
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
- `@squarebrowser_search_engine`, `@squarebrowser_dark_pages`, `@squarebrowser_text_zoom` - Browser settings
- `@squarebrowser_schedules`, `@squarebrowser_blocking`, `@squarebrowser_commitment`, `@squarebrowser_pending_changes` - Accountability settings

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

On Android, `modules/square-adblock` (a local Expo module, Kotlin) also wraps each WebView's `WebViewClient` and drops sub-resource requests (scripts, images, iframes, XHR) to domains in `AD_DOMAINS` before they download. `BrowserScreen.js` pushes the list with `setBlockedDomains()` and attaches the filter in `onLoadStart`. It is a no-op on iOS/web and below Android 8 (API 26), where the JavaScript blocking still applies. Changing the module requires `npx expo prebuild --clean` and a native rebuild.

The native filter also loads a bundled domain list (`modules/square-adblock/android/src/main/assets/adlist.txt`, about 40k domains) in the background at startup, so blocking works offline with no runtime network calls. It is generated by `node scripts/build-adlist.js` from the MIT-licensed StevenBlack/hosts list (attribution in `modules/square-adblock/THIRD_PARTY.md`) plus `scripts/adlist/extra-domains.txt`; `scripts/adlist/never-block.txt` lists roots that must never be blocked, and the script refuses to write the file if popular sites would be blocked. Rebuild it before a release to refresh the list. Matching is by domain suffix and only applies to sub-resource requests, never to pages the user opens.

### Bot-protection compatibility
`BOT_BYPASS_SCRIPT` (BrowserScreen.js, shown when Enhanced Compatibility is on) fakes Chrome details for Cloudflare-style checks. On **mobile user agents it does nothing**: real mobile Chrome has no PDF plugins and a different `window.chrome`, and those fakes made OLX's firewall reject logins (`error=waf_blocked`). Only desktop mode (Windows UA) gets the overrides. Re-test OLX and a Cloudflare site if you touch it.

### Popup ads and scroll locks
Popup ads lock page scrolling (`overflow:hidden`, `position:fixed` body, `modal-open`-style classes). Because the ad blocker deletes the ad instead of letting the page close it, `adBlockScript` calls `releaseScrollLock()` after removing a big layer: it only acts for 8 seconds after a removal and never while another full-screen layer (such as a cookie dialog) is showing. Test pages for the three lock styles plus a real dialog are easy to recreate with a local server; check that the first three scroll afterwards and the dialog stays locked.

### Screen headers
Stack screens (Settings, Accountability, History, Bookmarks, Products, Privacy Policy, Terms) must use `components/ScreenHeader.js`. It pads the top with the real safe-area inset because RN's `SafeAreaView` does nothing on Android (otherwise titles end up behind the status bar or camera cutout). Do not hand-roll a header in a screen.

### Background Playback
`modules/square-playback` (Android, Kotlin) runs a `mediaPlayback` foreground service with a media notification (title, thumbnail, back/play-pause/forward) backed by a `MediaSession`, so audio keeps playing when the app is backgrounded. `screens/backgroundPlayScript.js` is injected into every page: it reports media state per tab (`mediaState` messages), exposes `window.__sqMediaControl(action)` for the notification buttons, and, on YouTube only, hides visibility/blur/freeze events so the site doesn't pause itself. The WebView has **no Media Session API**, so title/thumbnail come from the page (`document.title`, `og:image`, YouTube thumbnail from `?v=`), and previous/next seek -10s/+10s. **Chromium pauses `<video>` in a hidden WebView** (audio-only elements keep playing), so `patches/react-native-webview+13.16.1.patch` (applied by `patch-package` on `npm install`) adds `RNCWebView.keepVisibleInBackground`, which makes the WebView keep reporting itself visible; `PlaybackService` flips it by reflection while running. If react-native-webview is upgraded, regenerate the patch. YouTube's own Previous/Next buttons (`aria-label` "Previous video"/"Next video") are clicked for the notification's skip buttons. The service stops 30s after the last media disappears, since skipping to the previous video navigates the page and a service cannot be restarted from the background. The service starts when a tab starts playing (must happen in the foreground, Android 12+) and follows the playing tab. Controlled by the `backgroundPlayEnabled` setting. Notification buttons reach the page through `evaluateInWebView(viewTag, js)` (native `evaluateJavascript`), not `ref.injectJavaScript`, because React Native's UI command queue stalls in the background. The WebView ref is an imperative handle, so native modules get the view tag from `e.nativeEvent.target` (e.g. in `onLoadStart`), never `findNodeHandle`.

### Translations (i18n/)
English is the source of truth and the **default for everyone**; the app never follows the device language. The user opts in from Settings > Language (stored as `@squarebrowser_language`). `BrowserContext` owns `language` and exposes `t(key, vars)`, so UI code does `const { t } = useBrowser()`. Module-level helpers (such as `promptOpenInApp`) take `t` as a parameter.

- Strings live in `i18n/<code>.js`, grouped by screen (English, Russian, Polish, German, Bengali). Missing keys fall back to English, but run `npm run check:i18n` — it fails on missing/extra keys and on `{{placeholder}}` mismatches.
- Plurals use objects (`one/few/many/other`) chosen by `vars.count`; the rules for ru/pl are hand-written in `i18n/index.js` (no `Intl.PluralRules`). `home.quotes` is a list in the same order as `QUOTE_STYLES` in `HomeScreen.js`.
- Unit labels come from `units.h/m/s` and may include a leading space (`' мин'`).
- Dates/times go through `formatLongDate` / `formatClock`. History groups by ISO date key, so non-Latin month names can never merge groups.
- Wording is deliberately plain and conversational rather than literal. The Privacy Policy and Terms of Service screens stay English (legal text).
- To add a language: add `i18n/<code>.js` with every key, register it in `LANGUAGES` and `DICTIONARIES` in `i18n/index.js`, and add its plural rule if it needs more than one/other. Right-to-left layouts are not supported yet.

### Search engines, dark pages, text size
`utils/url.js` turns address-bar input into a URL (one place; don't re-add copies) using the engine picked in Settings (Google, DuckDuckGo, Bing, Brave). "Dark Web Pages" (`screens/darkPagesScript.js`) inverts light pages with CSS and leaves pages that are already dark alone; the WebView's own force-dark flag does nothing on Android 13+. `window.__sqSetDark(on)` flips it without a reload. Text size uses the Android-only `textZoom` prop (both engines).

### Downloads
Normal http(s) downloads go to Android's DownloadManager (through react-native-webview, or `Downloads.kt` with the native engine). Pages that build a file themselves (blob:/data: links, including links clicked without being added to the page) are caught by `screens/downloadScript.js`, posted to the app as base64 (20 MB cap) and saved by `modules/square-downloads` (MediaStore on Android 10+, a direct file plus `WRITE_EXTERNAL_STORAGE` on older versions (the module asks up to API 28; Expo's template raises the merged limit to 32); that permission also makes react-native-webview's own downloads work there). The same module saves history/bookmark exports. Changing it needs `npx expo prebuild --clean`.

### Accountability (schedules, block list, SafeSearch, commitment lock)
Rules are pure functions in `utils/protection.js` (checked by `npm run check:protection`). State lives in `BrowserContext`; **every change goes through `requestProtectionChange(type, value)`** (UI: `useProtectedChange` in `components/ProtectionGate.js`). When the commitment lock is on, a change that makes limits weaker (`isLoosening`) waits 24 hours (`pendingChanges`, applied by a 15s tick) or needs the friend's PIN (salted SHA-256, `utils/sha256.js`); stricter changes always apply at once. Schedules can never leave less than 4 open hours a day or block more than 20 hours in a row, so nobody locks themselves out. Blocking is checked in three places: `navigateTo`/`addTab` (address bar, links from other apps), in-page navigation (`onShouldStartLoadWithRequest` on the classic engine; the native engine refuses links to `userBlockedHosts` in `shouldOverrideUrlLoading` and reports them as `onBlockedUrl`), and a sweep over all tabs (restored tabs, back/forward, pushState, sites added while open). SafeSearch rewrites search URLs (with a loop guard for sites that drop the parameter). YouTube Restricted Mode is not covered (it can't be set by URL).
### Open in app (WhatsApp, Play Store, intent:// links)
`getExternalAppLink()` (BrowserScreen.js) turns app links into something `Linking.openURL` can open: custom schemes (`whatsapp:`, `tg:`, `market:`...), Android `intent://` links (converted to their real scheme; `S.browser_fallback_url` is loaded if the app isn't installed), and web links that other browsers hand to the app (Play Store, `wa.me`, `api.whatsapp.com/send`, `chat.whatsapp.com`). `handleExternalLink()` in `BrowserTab` asks the user, with "Stay in browser" for web links. **The WebView must keep `originWhitelist={['*']}` on Android**: with the default, react-native-webview never passes non-http URLs to `onShouldStartLoadWithRequest` and instead calls `Linking.canOpenURL`, which is always false on Android 11+, so app buttons silently do nothing. `file:`/`content:` navigations are refused. New-window links (`onOpenWindow`, and `target="_blank"` app links that the ad blocker would otherwise drop) go through the same prompt.

### Native WebView engine (Android default)
`modules/square-webview` is SquareBrowser's own Android WebView component and the **default engine on Android**. Settings > "Classic Web Engine" switches back to react-native-webview as a fallback (stored as `@squarebrowser_classic_webview` = `'true'`; in code `nativeWebViewEnabled` is true for the new engine; the old experimental opt-in key `@squarebrowser_native_webview` is deleted on startup). iOS, web and builds without the module always use react-native-webview. Each `BrowserTab` picks its engine once when it mounts (switching would lose the tab's history), so the setting applies after a restart; Settings shows which engine is running (`nativeWebViewActive`). The JS wrapper (`modules/square-webview/index.js`) accepts the react-native-webview props BrowserTab uses and fires events with the same shapes (`nativeEvent.url/title/canGoBack/canGoForward/progress/data/targetUrl` and the view tag as `target`, so square-adblock's `attach` and square-playback's `evaluate` find the WebView unchanged); ref methods are `reload/goBack/goForward/stopLoading/injectJavaScript/loadUrl`. Scripts: `injectedJavaScriptBeforeContentLoaded` runs at document start via `WebViewCompat.addDocumentStartJavaScript` (main frame only; react-native-webview only evaluates it in `onPageStarted`, which races the page), `injectedJavaScript` on page finish.

- **Phase 1** (done): browsing, scripts, navigation state (including pushState), messages, a fresh WebView after a renderer crash.
- **Phase 2** (done): `shouldOverrideUrlLoading` decides main-frame navigations natively with `LinkRules.kt` (unit-tested in `src/test`): links to `blockedHosts` (the JS `AD_DOMAINS`, passed while Ad Blocker is on) are refused; app schemes and Play Store/WhatsApp web links are refused and sent to JS as `onExternalUrl` (`web: true` for web links: JS calls `ref.loadUrl(url)` when the user chose "Stay in browser"). Keep `LinkRules.isAppWebLink` in step with `getAppForWebLink()` in BrowserScreen.js. Popups go through `onCreateWindow`: a throwaway WebView catches the URL and `onOpenWindow` reports `{ targetUrl, userGesture }` to the existing handler.
- **Phase 3** (done): background video: `BrowserWebView.keepVisibleInBackground` (static, like the patched `RNCWebView` field) is set by `PlaybackService`'s `WebViewKeepVisible`, which flips both engines' flags by class name. Fullscreen video: `FullscreenVideo.kt` is the patch's fullscreen code (landscape on enter, rotate button, free rotation once the phone turns, system back leaves fullscreen), driven by `onShowCustomView`/`onHideCustomView`; it also leaves fullscreen when the tab is destroyed or its renderer dies.
- **Phase 4** (done): file uploads (`FileChooser.kt`, result through the module's `OnActivityResult`; no camera capture), downloads (`Downloads.kt`: Android's DownloadManager with the page's cookies, user agent and referer; public Downloads folder on Android 10+, the app's own Downloads folder below that since there is no storage permission; `onFileDownload` shows a toast; `blob:`/`data:` downloads are caught in the page by `screens/downloadScript.js`, see Downloads), page permissions (camera, microphone, location are always refused, as with the old engine: the app has none of those permissions, by choice), and native pull to refresh (see Pull to Refresh).
- **Default switch** (done): new engine on by default, classic engine as a Settings fallback.
- **Next**: once a release or two runs without needing the fallback, remove the classic engine on Android: the Settings switch, `patches/` and patch-package, the injected pull-to-refresh script path and the `RNCWebView` keep rules (react-native-webview itself stays for iOS).

`tools/engine-test/` is a page for comparing the engines on a phone (see its README).

### Pull to Refresh
react-native-webview's `pullToRefreshEnabled` only works on iOS. On Android, `screens/pullToRefreshScript.js` is injected: it watches for a downward drag that starts at the very top of the page and posts `pull` / `pullEnd` messages, and `BrowserTab` draws the spinner (`PullIndicator`) and calls `reload()`. Like Chrome, it does nothing when the page or an inner scroll box isn't at the top, the page sets `overscroll-behavior-y: none|contain`, the page calls `preventDefault` on the touch, the drag is sideways or two-finger, the page is zoomed, or a video is fullscreen. Controlled by the `pullToRefreshEnabled` setting (`@squarebrowser_pull_to_refresh`, default on).

With the new engine (`modules/square-webview`) the script and `PullIndicator` are not used: the WebView sits in Android's `SwipeRefreshLayout`. It only knows whether the WebView is scrolled, so `PullGuard.kt` injects a small page script that reports, at each touch, whether the page allows a pull (same rules as above, plus `touch-action` without `pan-y`, as on maps); `SquareWebView` resets the answer to "no" at every finger-down.

### Fullscreen Video
The WebView has `allowsFullscreenVideo` on, so a site's fullscreen button works (Android only handles it when that prop is set). The react-native-webview patch also makes fullscreen switch to landscape, adds a rotate button (top right), frees rotation once the phone is physically turned, and lets the system back gesture exit fullscreen (`RNCWebViewManagerImpl.kt` in `patches/`). If react-native-webview is upgraded, regenerate the patch.

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
- Production signing is applied by the `plugins/withReleaseSigning.js` config plugin on every prebuild (`android/` is regenerated, so never edit its signing config by hand). It reads `keystore.properties` from the project root (or the path in `SQUARE_KEYSTORE_PROPERTIES`); the keystore and properties file are git-ignored, so keep backups elsewhere
- Release builds use R8 minify + resource shrinking (set in `app.json` via `expo-build-properties`; Play Console flags "DEX code optimization" otherwise). `plugins/withR8Optimization.js` also switches to `proguard-android-optimize.txt` (full R8 optimization) and turns on `android.r8.optimizedResourceShrinking`, so code reached only by reflection must have a keep rule. `extraProguardRules` keeps `RNCWebView` and `expo.modules.squarewebview.**` (the playback service sets `keepVisibleInBackground` on both by reflection) and the local modules. Smoke-test a release build (tabs, ad blocking, background playback, fullscreen video, downloads) after changing native code or adding reflection, and add keep rules for it. Needs `npx expo prebuild --clean`
- Version info must match between `app.json` and `package.json`
- `release.bat` (runs `release.ps1`) bumps the version in `app.json`, `package.json` and `android/app/build.gradle`, builds the AAB and APK, checks the AAB is not debug-signed, and copies both to `release/v<name>-<code>/` as `squarebrowser-<name>-<code>.aab/.apk` (the folder is git-ignored and replaced on a rebuild of the same version)
- Use Expo Dev Client for development builds

### Version Management
`release.ps1` (or `release.bat`) reads the current release from `app.json` and offers the next one (1.0.9 / code 9 -> 1.0.10 / code 10; press Enter to accept). Typing the current or a lower version name or code asks for confirmation first.

When updating versions by hand:
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
