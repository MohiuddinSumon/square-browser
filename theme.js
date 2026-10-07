/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * theme.js — Central design-token module for SquareBrowser.
 *
 * Single source of truth for colors, spacing, radii, typography, shadows,
 * animation durations and iOS sheet constants. Every screen/component should
 * derive its palette from `getTheme(isDarkMode)` instead of hardcoding hex
 * values, so light/dark never drift out of sync and future accent
 * customization is a one-file change.
 *
 * DESIGN LANGUAGE: Apple / iOS HIG. This browser should feel like a first-party
 * Apple app. Colors follow the iOS system palettes exactly:
 *   - Light background #F2F2F7 (systemGroupedBackground), cards #FFFFFF.
 *   - Dark background #000000, cards #1C1C1E (secondarySystemGroupedBackground).
 *   - Accent is iOS blue #007AFF in BOTH themes (systemBlue).
 *   - Destructive is systemRed #FF3B30.
 *   - Separators: rgba(60,60,67,0.29) light / rgba(84,84,88,0.6) dark.
 *   - Text: #000 / #FFF primary, secondary ~60% opacity, tertiary ~30%.
 *
 * Dependency-free: plain JS objects with RN-compatible values only. No new
 * dependencies, no reanimated, no gesture-handler, no expo-blur.
 */

// iOS systemBlue — identical in both themes per HIG.
const ACCENT = '#007AFF';

// iOS system colors (semantic, mode-independent).
const SYSTEM_RED = '#FF3B30';
const SYSTEM_GREEN = '#34C759';
const SYSTEM_ORANGE = '#FF9500';
const SYSTEM_YELLOW = '#FFCC00';

const palettes = {
  light: {
    // Surfaces (lowest → highest elevation), per iOS system palettes.
    groupedBackground: '#F2F2F7', // systemGroupedBackground — screen base
    background: '#F2F2F7',        // alias for groupedBackground
    surface: '#FFFFFF',           // secondarySystemGroupedBackground — cards, sheets, bars
    surfaceAlt: '#F2F2F7',        // tertiary fill — chips, pressed fills, section wells
    surfaceRaised: '#FFFFFF',     // elevated cards / modals
    headerBackground: 'rgba(242,242,247,0.92)', // translucent header (no BlurView)
    tabBarBackground: 'rgba(242,242,247,0.92)', // translucent bottom bar
    // Text (iOS label colors).
    text: '#000000',
    textSecondary: 'rgba(60,60,67,0.6)', // secondaryLabel ~60%
    textTertiary: 'rgba(60,60,67,0.3)',  // tertiaryLabel ~30%
    textOnPrimary: '#FFFFFF',
    // Accent.
    accent: ACCENT,
    accentSoft: 'rgba(0,122,255,0.12)', // tinted fill for active/pressed accent states
    // Semantic.
    success: SYSTEM_GREEN,
    warning: SYSTEM_ORANGE,
    danger: SYSTEM_RED,
    dangerSoft: 'rgba(255,59,48,0.12)', // tinted fill for destructive pressed states
    // Borders / separators (iOS separator colors).
    border: 'rgba(60,60,67,0.29)',   // separator
    separator: 'rgba(60,60,67,0.29)',// alias for border
    borderStrong: 'rgba(60,60,67,0.4)',
    // Overlays / scrim.
    scrim: 'rgba(0,0,0,0.4)',        // modal / sheet background scrim
    overlay: 'rgba(0,0,0,0.4)',      // alias for scrim
    overlayLight: 'rgba(0,0,0,0.2)',
    // Bookmark / misc.
    bookmark: '#FF9500',             // warm amber bookmark icon
  },
  dark: {
    groupedBackground: '#000000',    // systemGroupedBackground — screen base
    background: '#000000',           // alias for groupedBackground
    surface: '#1C1C1E',              // secondarySystemGroupedBackground — cards, sheets, bars
    surfaceAlt: '#2C2C2E',           // tertiary fill — chips, pressed fills, section wells
    surfaceRaised: '#2C2C2E',        // elevated cards / modals
    headerBackground: 'rgba(0,0,0,0.92)',      // translucent header (no BlurView)
    tabBarBackground: 'rgba(0,0,0,0.92)',      // translucent bottom bar
    // Text (iOS label colors).
    text: '#FFFFFF',
    textSecondary: 'rgba(235,235,245,0.6)', // secondaryLabel ~60%
    textTertiary: 'rgba(235,235,245,0.3)',  // tertiaryLabel ~30%
    textOnPrimary: '#FFFFFF',
    // Accent.
    accent: ACCENT,                  // iOS blue stays #007AFF in dark too
    accentSoft: 'rgba(0,122,255,0.24)',
    // Semantic.
    success: SYSTEM_GREEN,
    warning: SYSTEM_ORANGE,
    danger: SYSTEM_RED,
    dangerSoft: 'rgba(255,59,48,0.24)',
    // Borders / separators (iOS separator colors).
    border: 'rgba(84,84,88,0.6)',    // separator
    separator: 'rgba(84,84,88,0.6)', // alias for border
    borderStrong: 'rgba(84,84,88,0.8)',
    // Overlays / scrim.
    scrim: 'rgba(0,0,0,0.4)',        // modal / sheet background scrim
    overlay: 'rgba(0,0,0,0.4)',      // alias for scrim
    overlayLight: 'rgba(0,0,0,0.25)',
    // Bookmark / misc.
    bookmark: '#FFB340',             // muted gold bookmark icon for dark
  },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// iOS sheet / grouped-card corner radius is 10pt (NOT 20-30).
const borderRadius = {
  sm: 8,
  md: 10,   // iOS grouped cards / sheets
  lg: 16,
  xl: 20,
  pill: 999,
};

// SF-style typography scale (iOS HIG).
const typography = {
  fontSizes: {
    caption: 12,     // Caption
    footnote: 15,    // Footnote
    body: 17,        // Body
    headline: 17,    // Headline (semibold)
    title3: 20,      // Title 3
    title2: 22,      // Title 2
    title1: 28,      // Title 1
    largeTitle: 34,  // Large Title
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  letterSpacing: {
    largeTitle: -0.4, // -0.4 on large titles per HIG
    title: -0.2,
  },
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
};

// iOS-like animation durations. Keep under 300ms, subtle, transform-only.
const animation = {
  fast: 120,
  normal: 200,
  slow: 300,
  // Spring config for sheets / press feedback (friction/tension ~ 8/100).
  spring: {
    friction: 8,
    tension: 100,
    useNativeDriver: true,
  },
  pressScale: 0.97,   // pressed scale for Pressable style functions
  pressOpacity: 0.6,  // pressed opacity for Pressable style functions
};

// iOS sheet constants (grab handle 36x5, radius 10).
const iosSheet = {
  grabHandleWidth: 36,
  grabHandleHeight: 5,
  grabHandleRadius: 2.5,
  sheetRadius: 10,
  maxHeightRatio: 0.85, // cap sheet height at 85% of screen
};

// Minimum touch target per Apple HIG (44pt).
const touchTarget = {
  min: 44,
  minIcon: 44,
  minRow: 44,
};

export const getTheme = (isDarkMode) => {
  const mode = isDarkMode ? 'dark' : 'light';
  return {
    mode,
    isDarkMode,
    colors: palettes[mode],
    spacing,
    borderRadius,
    typography,
    shadows,
    animation,
    iosSheet,
    touchTarget,
  };
};

export default getTheme;