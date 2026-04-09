# SPEC: Daily Browsing Timer

## 1. Objective

Add a **Daily Browsing Timer** feature to SquareBrowser that lets users set a daily time budget for browsing. The feature supports two enforcement modes:

- **Reminder mode** (default): Shows a blocking reminder screen when the budget is exhausted, but the user can dismiss it and continue.
- **Strict mode**: Locks the browser with a full-screen wall when time runs out — no further browsing until midnight resets the counter.

**Target users**: All users — privacy-conscious, power users, and general users alike.  
**Goal**: Encourage intentional browsing habits without sacrificing privacy. All data is local-only.

---

## 2. Core Features & Acceptance Criteria

### 2.1 Time Budget Setting
- User can set a daily browsing limit (e.g., 30 min, 1 h, 2 h) from Settings.
- Minimum: 5 minutes. Maximum: 23 hours 55 minutes. Default: disabled (off).
- Setting is persisted in AsyncStorage.

### 2.2 Active Time Tracking
- Timer only counts time while the app is **in the foreground** and a **WebView tab is visible** (not counting time on Settings, Bookmarks, or History screens).
- Uses the existing `activityTracker` pattern in `BrowserContext.js` — extend it rather than introduce a parallel system.
- Usage is saved to AsyncStorage as a per-day record keyed by calendar date (local time).

### 2.3 Address Bar Timer Chip
- While a daily limit is set, a small chip is shown in the address bar area displaying remaining time (e.g., `⏱ 1h 23m`).
- Chip turns **amber** when ≤ 10 minutes remain.
- Chip turns **red** when ≤ 2 minutes remain.
- Chip respects dark/light theme.

### 2.4 Reminder Mode (soft enforcement)
- When time runs out and strict mode is **OFF**, show a full-screen reminder overlay on top of the browser.
- Overlay includes: "You've reached your daily browsing limit" message, time spent today, and a "Continue Anyway" button.
- Overlay can be dismissed — user continues browsing (time keeps accumulating but no further warnings until next day).

### 2.5 Strict Mode (hard enforcement)
- When time runs out and strict mode is **ON**, show a full-screen **blocking wall** that replaces the WebView.
- The wall cannot be dismissed. It shows:
  - "Daily limit reached" heading
  - Time spent today
  - Countdown to midnight reset
  - A motivational/accountability message
- No button to override — the user must wait for midnight reset.
- Navigating away to Settings/Bookmarks is still allowed (not blocked).

### 2.6 Midnight Reset
- The daily timer resets at 12:00 AM local device time.
- On reset: accumulated time for the previous day is preserved in history (read-only), and today's counter starts fresh.
- The blocking wall lifts automatically at midnight without requiring an app restart.

### 2.7 Settings UI
- New "Browsing Timer" section in `SettingsScreen.js`:
  - Toggle: **Enable Daily Limit** (on/off)
  - Picker/input: **Daily Limit** (shown only when enabled)
  - Toggle: **Strict Mode** (shown only when enabled) — includes a brief warning that strict mode cannot be bypassed

---

## 3. Project Structure

### New files
```
context/TimerContext.js          # (optional) Or extend BrowserContext
screens/TimerWallScreen.js       # Full-screen blocking wall component
components/TimerChip.js          # Address bar chip showing remaining time
components/TimerReminderOverlay.js  # Soft-mode reminder overlay
utils/timerStorage.js            # AsyncStorage helpers for timer data
```

### Modified files
```
context/BrowserContext.js        # Extend activityTracker to feed timer; add timer state
components/AddressBar.js         # Render <TimerChip /> when limit is set
screens/BrowserScreen.js         # Render <TimerReminderOverlay /> and <TimerWallScreen /> conditionally
screens/SettingsScreen.js        # Add Browsing Timer section
```

---

## 4. Data Model

### AsyncStorage keys (via `utils/timerStorage.js`)
| Key | Value | Notes |
|-----|-------|-------|
| `@squarebrowser_timer_settings` | `{ enabled, dailyLimitMs, strictMode }` | User preferences |
| `@squarebrowser_timer_daily_<YYYY-MM-DD>` | `{ totalMs, limitReached, date }` | Per-day record (read-only history) |

### In-memory state (BrowserContext or TimerContext)
```js
{
  timerEnabled: bool,
  dailyLimitMs: number,
  strictMode: bool,
  todayElapsedMs: number,       // accumulated browsing time today
  limitReached: bool,           // triggers overlay/wall
  reminderDismissed: bool,      // prevents re-showing overlay after dismiss
  msUntilMidnight: number,      // for countdown in wall
}
```

---

## 5. Code Style

- Follow existing patterns: `useBrowser()` hook for all state access.
- All new components use `StyleSheet.create()` with dark mode support via `isDarkMode` from BrowserContext.
- Icons from `@expo/vector-icons` (Ionicons) — no new icon libraries.
- Copyright header in all new source files: `// Copyright (c) 2025 SquareBrowser Contributors`
- No external API calls. No analytics. No permissions beyond what the app already uses.
- Platform-specific code via `Platform.OS` as needed; Android-first priority.

---

## 6. Testing Strategy

### Manual test cases
1. Set a 5-minute limit → browse for 5 minutes → reminder overlay appears (strict OFF).
2. Dismiss overlay → continue browsing → no second overlay today.
3. Enable strict mode → exhaust limit → blocking wall appears, cannot be dismissed.
4. Wait for midnight (or mock date) → wall lifts, counter resets to 0.
5. Timer chip color transitions: green → amber (≤10 min) → red (≤2 min).
6. Timer pauses when app goes to background; resumes on foreground.
7. Timer pauses on non-browser screens (Settings, History, Bookmarks).
8. Daily records preserved after reset; viewable in AsyncStorage.
9. Disabling the timer in Settings hides chip and removes all enforcement.
10. Dark mode: all new components render correctly in both themes.

### Edge cases
- App killed and reopened mid-day: accumulated time from previous sessions must be loaded from AsyncStorage and added to in-memory counter.
- Device time changed manually: use saved date string as the key; do not trust elapsed wall-clock deltas across sessions naively.
- Strict mode enabled after limit already reached today: wall should immediately show.

---

## 7. Boundaries

### Always do
- Store all timer data locally in AsyncStorage only.
- Record browsing time in the existing history/usage system in addition to the timer system.
- Respect dark/light theme in every new UI component.
- Allow the user to navigate to Settings even when the wall is showing (so they can disable the timer if needed).

### Ask first about
- Adding a PIN-protected override for strict mode (not in scope now, but likely requested later).
- Exporting timer history to a file.
- Per-site time limits (separate, more complex feature).

### Never do
- Send timer data to any external server or API.
- Delete browsing history as a side effect of timer enforcement.
- Bypass the blocking wall with any in-app gesture or back button press.
- Add any background service or foreground notification (outside current app permissions).
