# TODO: Link Long-Press Context Menu

## Task 1 — `addTabInBackground` in `context/BrowserContext.js`
- [ ] Add `addTabInBackground(url)` callback after `addTab` (~line 505)
- [ ] `setTabs` updater appends new tab WITHOUT calling `setActiveTabIndex`
- [ ] Add URL formatting (same as `navigateTo`: add `https://`, handle search)
- [ ] Expose `addTabInBackground` in context `value` useMemo + deps array
- [ ] Verify: calling it increases `tabs.length` but leaves `activeTabIndex` unchanged

## Task 2 — `linkLongPressScript` injection in `screens/BrowserScreen.js`
- [ ] Add `linkLongPressScript` constant inside `BrowserTab` after `scrollTrackingScript`
- [ ] Script: `findAnchor()` walks up DOM to find `<a href>` from any touch target
- [ ] Script: 500ms `touchstart` timer fires `postMessage({ type: 'linkLongPress', url, text })`
- [ ] Script: cancel timer on `touchmove`, `touchend`, `touchcancel`
- [ ] Script: suppress Android `contextmenu` event on link targets
- [ ] Concatenate `linkLongPressScript` to `injectedJavaScript` prop
- [ ] Verify: long-press a link → postMessage fires; short tap → no message; scroll safety passes

## Task 3 — Extend `onMessage` + add `onLinkLongPress` prop to `BrowserTab`
- [ ] Add `onLinkLongPress` to `BrowserTab` function signature
- [ ] Extend `onMessage` handler: dispatch `data.type === 'linkLongPress'` to `onLinkLongPress(url, text)`
- [ ] Wrap both type branches in `try/catch` (already present — keep it)
- [ ] Pass `onLinkLongPress={isActive ? handleLinkLongPress : undefined}` in parent render loop
- [ ] Verify: message reaches `BrowserScreen` handler; scroll-tracking still works

## Task 4 — `LinkContextMenu` modal + wiring in `screens/BrowserScreen.js`

### 4a — Install expo-clipboard
- [ ] Run `npx expo install expo-clipboard`

### 4b — Imports + state + handlers in `BrowserScreen`
- [ ] Add `import * as Clipboard from 'expo-clipboard'`
- [ ] Add `Share` to existing `react-native` destructure import
- [ ] Add `linkMenuVisible` + `longPressedLink` state declarations
- [ ] Destructure `addTabInBackground`, `toggleBookmark` from `useBrowser()`
- [ ] Add `handleLinkLongPress(url, text)` callback — guards `javascript:` URIs
- [ ] Add `handleOpenInNewTab`, `handleOpenInBackground`, `handleCopyLink`, `handleShareLink`, `handleAddBookmark` callbacks

### 4c — `LinkContextMenu` component
- [ ] Build component above `StyleSheet.create`
- [ ] URL header row (truncated at 50 chars) with link icon
- [ ] 5 action rows with Ionicons icons + labels
- [ ] Cancel row at bottom with blue text
- [ ] Tap-outside via outer `TouchableOpacity` overlay
- [ ] Inner `View` uses `onStartShouldSetResponder` to prevent close on inside taps
- [ ] Dark mode support via `isDarkMode` prop
- [ ] `animationType="slide"` bottom sheet

### 4d — Styles
- [ ] Add `contextMenuSheet`, `contextMenuHeader`, `contextMenuUrl`, `contextMenuItem`, `contextMenuIcon`, `contextMenuItemText`, `contextMenuCancel`, `contextMenuCancelText` to `StyleSheet.create`

### 4e — Mount in JSX
- [ ] Add `<LinkContextMenu ... />` alongside `ExitModal` / `TabSwitcher`

## Verification Checklist
- [ ] Long-press link → menu appears; short tap → navigates normally
- [ ] Scrolling through links → no menu trigger
- [ ] `<img>` inside `<a>` → menu shows the `<a>` URL
- [ ] Open in New Tab → switches to new tab
- [ ] Open in Background Tab → stays on current; new tab visible in switcher
- [ ] Copy Link → paste confirms correct URL
- [ ] Share → native OS share sheet opens
- [ ] Add Bookmark → URL in bookmarks screen
- [ ] Cancel / tap outside → closes cleanly, no action fired
- [ ] Dark mode → correct colors throughout
- [ ] Android → system WebView context menu does NOT appear
- [ ] Scroll-tracking / navbar auto-hide → no regression

---
<!-- Previous todos archived below — Cloudflare / Bot-Verification Fix -->
# TODO: Cloudflare / Bot-Verification Fix

## Task 1 — Update User-Agent strings
- [ ] Update `MOBILE_UA` (Android) to Chrome 124 / Android 14 / Pixel 8 in `context/BrowserContext.js:84`
- [ ] Update `MOBILE_UA` (iOS) to iOS 17.4 Safari in `context/BrowserContext.js:83`
- [ ] Update `DESKTOP_UA` to Chrome 124 in `context/BrowserContext.js:86`
- [ ] Add a comment with the date the UA was last updated
- [ ] Verify: visit whatismybrowser.com and confirm Chrome 124 is reported

## Task 2 — Bot-bypass injection before page content loads
- [ ] Create `botBypassScript` constant in `BrowserScreen.js` inside `BrowserTab`
- [ ] Script must override `navigator.webdriver` → `false` via `Object.defineProperty`
- [ ] Script must inject realistic `window.chrome` object (runtime, loadTimes, csi, app)
- [ ] Script must spoof `navigator.plugins` with 5 realistic plugin entries
- [ ] Script must spoof `navigator.mimeTypes` to match plugins
- [ ] Add `injectedJavaScriptBeforeContentLoaded={botBypassScript}` prop to `<WebView>`
- [ ] Guard: only inject when `enhancedCompatEnabled` is true (connects to Task 5)
- [ ] Verify: visit bot.sannysoft.com — webdriver row and chrome object row both PASS

## Task 3 — Remove loading overlay that blocks challenge UI
- [ ] Change `startInLoadingState={false}` in `BrowserTab`'s `<WebView>` (`BrowserScreen.js:127`)
- [ ] Remove the `renderLoading` prop
- [ ] Add a thin progress bar: handle `onLoadStart` / `onLoadProgress` / `onLoadEnd` in `BrowserTab`
- [ ] Style the progress bar to be non-blocking (absolute position, top of webview, 3px height)
- [ ] Verify: navigate to nowsecure.nl — challenge is fully visible and tappable

## Task 4 — Cloudflare challenge detection banner
- [ ] Add `isCloudflareChallenge` state to `BrowserTab` (or `BrowserScreen`)
- [ ] In `onNavigationStateChange`, detect `challenges.cloudflare.com` or `cdn-cgi/challenge-platform` in URL
- [ ] Also detect page title "Just a moment" via `onLoadEnd` nativeEvent.title check
- [ ] Render a dismissible banner below the address bar when detected
- [ ] Banner text: "Cloudflare is verifying your browser — please wait…"
- [ ] Banner includes a Reload button (`webViewRef.reload()`)
- [ ] Auto-dismiss banner when navigation moves away from challenge URL
- [ ] Verify: visit a CF-protected site — banner appears; Reload button works; banner clears on success

---

## CHECKPOINT B — Integration test (manual)
- [ ] discord.com loads without getting stuck
- [ ] npmjs.com loads without getting stuck
- [ ] nowsecure.nl challenge is visible and completable
- [ ] cloudflare.com/products loads without getting stuck
- [ ] medium.com loads without getting stuck
- [ ] Existing ad-blocking still works (visit a site with ads)
- [ ] Tab switching still preserves navigation history

---

## Task 5 — Settings toggle: Enhanced Compatibility Mode
- [ ] Add `enhancedCompatEnabled` state + AsyncStorage persistence to `BrowserContext.js`
- [ ] Add `setEnhancedCompatPref` function to context
- [ ] Expose `enhancedCompatEnabled` and `setEnhancedCompatPref` in context value
- [ ] Add toggle in `SettingsScreen.js` → Privacy section, below "Ad Blocking"
- [ ] Label: "Enhanced Compatibility Mode" / subtitle: "Helps load sites with Cloudflare protection"
- [ ] Default ON for new installs
- [ ] Pass `enhancedCompatEnabled` prop to `BrowserTab`; conditionally set `injectedJavaScriptBeforeContentLoaded`
- [ ] Verify: toggle OFF → reload bot.sannysoft.com → webdriver FAILS; toggle ON → PASSES; persists after restart

---

## CHECKPOINT C — Final regression
- [ ] Normal browsing (Google, Wikipedia, YouTube) unaffected
- [ ] Ad blocking works
- [ ] Tab history preserved across tab switches
- [ ] Settings toggles (ad block, compat mode, dark mode) all persist
- [ ] No new crashes on Android
