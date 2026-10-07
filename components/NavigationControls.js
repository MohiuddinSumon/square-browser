/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * NavigationControls — the browser back/forward/refresh/home control row.
 * Visual/UX only: navigation logic and the single active-tab webViewRef
 * wiring are untouched.
 *
 * DESIGN LANGUAGE: iOS HIG. Colors come from theme.js tokens via
 * getTheme(isDarkMode) so light/dark never drift. Buttons are pill-shaped
 * Pressables with transform-only press feedback (scale 0.97 / opacity 0.6),
 * useNativeDriver:true, no new dependencies.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';

const NavigationControls = () => {
  const { canGoBack, canGoForward, goBack, goForward, refresh, navigateTo, isDarkMode } = useBrowser();
  const theme = getTheme(isDarkMode);
  const { colors, animation, touchTarget } = theme;

  // Home destination: about:blank — keep in sync with App.js CustomBottomNav's
  // handleHome so the two home affordances behave identically.
  const handleHome = () => {
    navigateTo('about:blank');
  };

  const iconColor = (enabled) => (enabled ? colors.accent : colors.textTertiary);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && {
            transform: [{ scale: animation.pressScale }],
            opacity: animation.pressOpacity,
          },
        ]}
        onPress={goBack}
        disabled={!canGoBack}
        accessibilityLabel="Back"
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={24} color={iconColor(canGoBack)} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && {
            transform: [{ scale: animation.pressScale }],
            opacity: animation.pressOpacity,
          },
        ]}
        onPress={goForward}
        disabled={!canGoForward}
        accessibilityLabel="Forward"
        accessibilityRole="button"
      >
        <Ionicons name="arrow-forward" size={24} color={iconColor(canGoForward)} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && {
            transform: [{ scale: animation.pressScale }],
            opacity: animation.pressOpacity,
          },
        ]}
        onPress={refresh}
        accessibilityLabel="Refresh"
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={24} color={colors.accent} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && {
            transform: [{ scale: animation.pressScale }],
            opacity: animation.pressOpacity,
          },
        ]}
        onPress={handleHome}
        accessibilityLabel="Home"
        accessibilityRole="button"
      >
        <Ionicons name="home" size={24} color={colors.accent} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  button: {
    padding: 6,
    minWidth: 40,
    minHeight: 44, // Apple HIG minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NavigationControls;