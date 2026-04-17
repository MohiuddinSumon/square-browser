# Plan: Fix Cloudflare / Bot-Verification Screen Hang

**Date:** 2026-04-16  
**Symptom:** Sites protected by Cloudflare (and similar services — hCaptcha, Turnstile, DDoS-Guard) show an infinite spinner or get permanently stuck on the "Checking your browser / Verify you are human" page inside SquareBrowser.

---

## Root Cause Analysis

React Native's `WebView` is not a full Chrome browser — Cloudflare's bot-detection layer fingerprints the environment and routes suspicious clients through a JavaScript challenge loop. SquareBrowser trips **five independent bot signals**:

| # | Signal | Where it comes from | Cloudflare consequence |
|---|--------|---------------------|------------------------|
| 1 | **Outdated User-Agent** | `BrowserContext.js:84` — Chrome 112, Android 13 SM-G991B | Old UA → higher bot score |
| 2 | **`navigator.webdriver = true`** | Set automatically by Android WebView runtime | Explicit bot flag; Cloudflare blocks most webdriver fingerprints |
| 3 | **`window.chrome` object missing/incomplete** | Real Chrome injects this; WebView doesn't | Cloudflare JS checks `window.chrome.runtime` |
| 4 | **Empty `navigator.plugins` / `navigator.mimeTypes`** | WebView exposes empty arrays | Expected to be non-empty in real browsers |
| 5 | **Loading overlay blocks challenge interaction** | `startInLoadingState={true}` in `BrowserScreen.js:127` — shows an `ActivityIndicator` overlay while the page loads | Cloudflare's JS challenge renders its UI but it is obscured by the spinner; challenge cannot complete → infinite loop |

Signal #2 + #5 together explain the "stuck forever" experience: the WebView is flagged as a bot AND the user can't interact with the challenge page even if one renders.

Additionally, `injectedJavaScript` (line 134 of BrowserScreen.js) runs **after** page content loads — too late to intercept Cloudflare's early bot checks. The fix requires `injectedJavaScriptBeforeContentLoaded` which runs in a clean JS context before the page's own scripts.

---

## Dependency Graph

```
BrowserContext.js
  └── userAgent (MOBILE_UA / DESKTOP_UA)
        └── passed as prop to BrowserTab (BrowserScreen.js)
              └── WebView props:
                    ├── userAgent                         ← Task 1
                    ├── injectedJavaScript                ← current (ad-block, scroll)
                    ├── injectedJavaScriptBeforeContentLoaded ← Task 2 (new)
                    ├── startInLoadingState / renderLoading   ← Task 3
                    └── onNavigationStateChange               ← Task 4 (CF detection)

SettingsScreen.js
  └── reads/writes BrowserContext state
        └── Task 5: new "Enhanced Compatibility" toggle
```

Tasks 1–4 touch `BrowserScreen.js` and `BrowserContext.js` only.  
Task 5 adds one toggle to `SettingsScreen.js` and one state field to `BrowserContext.js`.  
Tasks are ordered by impact; each can be shipped independently.

---

## Tasks

### CHECKPOINT A — Diagnosis confirmed, no user-visible changes
> Read the files, validate assumptions, do not write code yet.
> ✅ Done as part of this planning phase.

---

### Task 1 — Update User-Agent to current Chrome (high impact, trivial change)

**File:** `context/BrowserContext.js` lines 82–86  
**What:** Replace the Chrome 112 / Android 13 UA with Chrome 124 on Android 14, and update the iOS Safari UA to iOS 17.4. These match widely-deployed real devices.

```
MOBILE_UA (Android):
  Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36

MOBILE_UA (iOS):
  Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1

DESKTOP_UA:
  Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Safari/537.36
```

**Acceptance criteria:**
- Visit `https://www.whatismybrowser.com` → shows Chrome 124, not Chrome 112
- Cloudflare-protected sites load faster or skip the challenge entirely for ~30% of cases

**Verification:** Manual test on a known CF-protected site (e.g., discord.com, npmjs.com).

---

### Task 2 — Inject bot-bypass script BEFORE page content loads (high impact)

**File:** `screens/BrowserScreen.js` — `BrowserTab` component  
**What:** Add a new `injectedJavaScriptBeforeContentLoaded` prop to `<WebView>`. This prop runs the script in the main frame before the page's own JavaScript, which is the only window to intercept Cloudflare's early bot checks.

The script must:
1. Override `navigator.webdriver` → `false`
2. Inject a realistic `window.chrome` object with `chrome.runtime`, `chrome.loadTimes`, `chrome.csi`, `chrome.app`
3. Spoof `navigator.plugins` with 5 realistic plugin entries (PDF Viewer, Chrome PDF Plugin, Native Client, etc.)
4. Spoof `navigator.mimeTypes` correspondingly
5. Override `navigator.languages` to a realistic locale array
6. Wrap `HTMLCanvasElement.prototype.toDataURL` to return a tiny noise perturbation (optional — prevents canvas fingerprint matching)

**Important:** This script runs for ALL pages, not just Cloudflare. It must not break normal sites. The overrides are read-only property redefinitions via `Object.defineProperty` with `configurable: false` so the page cannot undo them.

**Acceptance criteria:**
- Visit `https://bot.sannysoft.com` → "webdriver" row shows PASSED (green), chrome object row PASSED
- `navigator.webdriver` is `false` in DevTools / WebView console
- Existing sites (Google, YouTube, Reddit) continue to function normally

**Verification:** Use the address bar to visit `bot.sannysoft.com` before and after the change.

---

### Task 3 — Remove loading overlay that blocks challenge interaction (high impact)

**File:** `screens/BrowserScreen.js` — `BrowserTab` component, line 127  
**What:** Change `startInLoadingState={true}` to `startInLoadingState={false}` and remove the `renderLoading` prop. This prevents the `ActivityIndicator` overlay from sitting on top of the Cloudflare challenge UI.

Add a separate, non-blocking loading indicator: a thin horizontal progress bar at the top of the WebView (like real browsers use) driven by the WebView's `onLoadStart` / `onLoadProgress` / `onLoadEnd` events. This replaces the full-screen overlay approach.

If implementing the progress bar adds complexity, the minimum viable fix is simply setting `startInLoadingState={false}` — the page will still load, just without a spinner.

**Acceptance criteria:**
- Cloudflare challenge page is fully visible and interactive (no overlay blocking it)
- User can tap the "I am human" checkbox / Turnstile widget without obstruction
- Pages still appear to load (either via progress bar or by natural page rendering)

**Verification:** Navigate to `https://nowsecure.nl` (a Cloudflare bot-detection test page) — the challenge must be visible and completable.

---

### Task 4 — Detect Cloudflare challenge URLs and show user hint (medium impact)

**File:** `screens/BrowserScreen.js` — `BrowserTab`'s `onNavigationStateChange` handler / `handleTabUpdate`  
**What:** Detect when the current URL contains Cloudflare challenge patterns:
- URL hostname is `challenges.cloudflare.com`
- URL path contains `/cdn-cgi/challenge-platform/`
- Page title contains "Just a moment" or "Checking your browser"

When detected, update a state flag `isCloudflareChallenge` and render a small dismissible banner **below** the address bar (not over the WebView) saying:  
> "Cloudflare verification — please wait or tap to reload"  
with a reload button. This helps users understand they're not stuck — the page is running a security check.

**Acceptance criteria:**
- Banner appears within 2 seconds of landing on a Cloudflare challenge page
- Banner has a "Reload" button that calls `webViewRef.reload()`
- Banner auto-dismisses when navigation moves away from the challenge URL
- Banner does not appear on normal pages

**Verification:** Visit a Cloudflare-protected site in Challenges mode; confirm banner appears and dismiss works.

---

### CHECKPOINT B — Core fixes complete
> After Tasks 1–4 are merged: Test 5 known Cloudflare-protected sites.  
> Pass criteria: ≥4 of 5 load without getting stuck on the challenge screen.  
> Sites to test: discord.com, npmjs.com, nowsecure.nl, cloudflare.com/products, medium.com

---

### Task 5 — Settings toggle: "Enhanced Compatibility Mode" (low impact, UX polish)

**Files:** `screens/SettingsScreen.js`, `context/BrowserContext.js`  
**What:** Add a new toggle in Settings → Privacy section:
- Label: **Enhanced Compatibility Mode**
- Subtitle: "Improves loading on sites with bot protection (Cloudflare, hCaptcha)"
- Default: **ON**
- Persisted to AsyncStorage key `@squarebrowser_enhanced_compat`

When OFF, skip `injectedJavaScriptBeforeContentLoaded` (the bot-bypass script from Task 2). This gives power users who distrust the override an opt-out.

**Acceptance criteria:**
- Toggle appears in Settings below "Ad Blocking"
- Toggling OFF causes `navigator.webdriver` to revert to its native value on next page load
- State is persisted across app restarts
- Default is ON for new installs

**Verification:** Toggle OFF → reload bot.sannysoft.com → webdriver row fails. Toggle ON → reload → passes.

---

### CHECKPOINT C — Full feature complete
> Run a final regression across all main features:
> - Normal browsing (Google, Wikipedia) unaffected
> - Ad blocking still works
> - Tab switching preserves navigation history
> - Settings toggles persist across restarts

---

## Implementation Notes

### Why `injectedJavaScriptBeforeContentLoaded` and not `injectedJavaScript`
The current `injectedJavaScript` prop (used for ad-blocking) runs **after** `DOMContentLoaded`. Cloudflare's Turnstile and IUAM checks run during initial script execution, before the DOM is ready. `injectedJavaScriptBeforeContentLoaded` runs in the `window` context before any page scripts, which is the only viable injection point.

**Caveat:** On iOS, `injectedJavaScriptBeforeContentLoaded` only works in the main frame, not iframes. Cloudflare Turnstile runs in an iframe. This means the iOS fix is partial — the webdriver flag override may not reach the Turnstile iframe on iOS. The Android fix is complete.

### Why not use a custom `fetch`/`XMLHttpRequest` TLS fingerprint fix
TLS JA3 fingerprinting (another Cloudflare detection vector) happens at the network layer. React Native WebView uses the platform's native HTTP stack, so JS injection cannot fix it. This is a known limitation of all WebView-based browsers — native Chrome's TLS fingerprint differs. For a full fix, the app would need to proxy traffic through a custom OkHttp (Android) or URLSession (iOS) configuration, which is a significant native module change. This is out of scope for this plan.

### User-Agent maintenance
The UA string will need updating approximately every 6 months as Chrome versions advance. Consider adding a comment in the code marking the last update date.
