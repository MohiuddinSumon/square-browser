/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * AddressBar - URL input with navigation controls, bookmark toggle, and
 * remaining-time chip. Visual/UX layer only: all browser state and navigation
 * logic is read from BrowserContext unchanged.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ActivityIndicator, StyleSheet, Platform, Keyboard, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import TimerChip from './TimerChip';
import { getTheme } from '../theme.js';

const AddressBar = () => {
  const { currentUrl, navigateTo, toggleBookmark, checkIsBookmarked, isDarkMode,
          timerEnabled, dailyLimitMs, todayElapsedMs, limitReached, extensionMs } = useBrowser();

  const theme = getTheme(isDarkMode);
  const { colors, spacing, borderRadius, shadows, animation, touchTarget } = theme;

  const remainingMs = Math.max(0, dailyLimitMs + (extensionMs || 0) - todayElapsedMs);
  const showChip = timerEnabled && !limitReached;

  const [urlInput, setUrlInput] = useState(currentUrl === 'about:blank' ? '' : currentUrl);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [navError, setNavError] = useState(false);

  // Animated values for the trailing controls (slide/fade on keyboard) and the
  // loading progress bar (opacity only — transform/opacity, native driver).
  const actionsOpacity = useRef(new Animated.Value(1)).current;
  const actionsTranslateY = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;

  const loadTimer = useRef(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Animate the trailing controls in/out when the keyboard appears. The chip
  // stays visible (kept outside this animated group) so remaining time is never
  // lost while typing. Duration stays under 300ms, transform-only.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(actionsOpacity, {
        toValue: keyboardVisible ? 0 : 1,
        duration: animation.normal,
        useNativeDriver: true,
      }),
      Animated.timing(actionsTranslateY, {
        toValue: keyboardVisible ? 8 : 0,
        duration: animation.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, [keyboardVisible, actionsOpacity, actionsTranslateY, animation.normal]);

  // Fade the thin progress bar in/out with the loading state.
  useEffect(() => {
    Animated.timing(progressOpacity, {
      toValue: isLoading ? 1 : 0,
      duration: animation.fast,
      useNativeDriver: true,
    }).start();
  }, [isLoading, progressOpacity, animation.fast]);

  // Sync with currentUrl ONLY when not focused
  useEffect(() => {
    if (!isFocused) {
      const normalizedTarget = currentUrl === 'about:blank' ? '' : currentUrl;
      setUrlInput(normalizedTarget);
    }
  }, [currentUrl, isFocused]);

  useEffect(() => {
    if (currentUrl !== 'about:blank') {
      checkIsBookmarked(currentUrl).then(setIsBookmarked);
    } else {
      setIsBookmarked(false);
    }
  }, [currentUrl, checkIsBookmarked]);

  // Begin a load: show the progress bar, clear any prior error, and settle after
  // a short window. If the page never left about:blank, surface an inline error
  // with a retry affordance. Compares against the target URL actually being
  // navigated to (passed in), not the render-closure currentUrl, so a valid
  // navigation from home doesn't false-positive and a real failure from a real
  // page isn't a false negative.
  const beginLoad = (targetUrl) => {
    setNavError(false);
    setIsLoading(true);
    clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => {
      if (targetUrl === 'about:blank') {
        setNavError(true);
      }
      setIsLoading(false);
    }, 2500);
  };

  useEffect(() => {
    return () => clearTimeout(loadTimer.current);
  }, []);

  const handleGo = () => {
    const target = urlInput.trim();
    if (target) {
      beginLoad(target);
      navigateTo(target);
    }
  };

  const handleRetry = () => {
    const target = urlInput.trim() || currentUrl;
    beginLoad(target);
    navigateTo(target);
  };

  const handleBookmarkToggle = () => {
    toggleBookmark(currentUrl).then((bookmarked) => {
      setIsBookmarked(bookmarked);
    });
  };

  const getSecureIcon = () => {
    if (currentUrl === 'about:blank') {
      return 'home';
    }
    if (currentUrl.startsWith('https://')) {
      return 'lock-closed';
    }
    return 'lock-open';
  };

  const currentIconColor = currentUrl === 'about:blank'
    ? colors.accent
    : (currentUrl.startsWith('https://') ? colors.success : colors.warning);

  const pressedStyle = ({ pressed }) => ({
    opacity: pressed ? animation.pressOpacity : 1,
    transform: [{ scale: pressed ? animation.pressScale : 1 }],
  });

  return (
    <View
      style={[
        styles.container,
        keyboardVisible && styles.containerKeyboardVisible,
        {
          backgroundColor: keyboardVisible ? colors.surfaceAlt : 'transparent',
          borderTopColor: colors.separator,
          borderTopWidth: isDarkMode ? 0 : 1,
        },
        isDarkMode && !keyboardVisible && styles.darkElevation,
      ]}
    >
      <View style={styles.addressBarContainer}>
        <View style={[styles.urlContainer, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.lockIcon} />
          ) : (
            <Ionicons
              name={getSecureIcon()}
              size={14}
              color={currentIconColor}
              style={styles.lockIcon}
            />
          )}
          <TextInput
            style={[styles.urlInput, { color: colors.text }]}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleGo}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter URL or search"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus={true}
            returnKeyType="go"
            blurOnSubmit={true}
          />
        </View>

        <View style={styles.trailingRow}>
          <Animated.View
            style={[
              styles.actions,
              { opacity: actionsOpacity, transform: [{ translateY: actionsTranslateY }] },
            ]}
          >
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressedStyle({ pressed })]}
              onPress={handleBookmarkToggle}
              hitSlop={4}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isBookmarked ? colors.bookmark : colors.textSecondary}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressedStyle({ pressed })]}
              onPress={handleGo}
              hitSlop={4}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.accent} />
            </Pressable>
          </Animated.View>

          {/* Fixed-width chip slot so the chip never squeezes the URL field. */}
          <View style={styles.chipSlot}>
            {showChip && <TimerChip remainingMs={remainingMs} />}
          </View>
        </View>
      </View>

      {/* Thin progress bar under the URL field (opacity-only animation). */}
      <Animated.View
        style={[
          styles.progressBar,
          { backgroundColor: colors.accent, opacity: progressOpacity },
        ]}
      />

      {navError && (
        <View style={styles.errorRow}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            Couldn't load that page.
          </Text>
          <TouchableOpacity onPress={handleRetry} hitSlop={8}>
            <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  darkElevation: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 -1px 3px rgba(0,0,0,0.35)',
      },
    }),
  },
  containerKeyboardVisible: {
    ...Platform.select({
      android: {
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      web: {
        boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
      },
    }),
  },
  addressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    minHeight: 44,
  },
  lockIcon: {
    marginRight: 6,
  },
  urlInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    margin: 0,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSlot: {
    width: 66,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 4,
    paddingBottom: 2,
  },
  errorText: {
    fontSize: 13,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AddressBar;