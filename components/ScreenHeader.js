/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * ScreenHeader — the one header every stack screen uses (Settings, History, Bookmarks,
 * Products, Privacy Policy, Terms of Service), so spacing and look stay identical.
 *
 * RN's SafeAreaView does nothing on Android, so the top padding comes from the real
 * safe-area inset (status bar / camera cutout) instead of a hard-coded number.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';

const ScreenHeader = ({ title, subtitle, onBack }) => {
  const { isDarkMode, t } = useBrowser();
  const { colors, animation } = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.headerBackground,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && { opacity: animation.pressOpacity }]}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="arrow-back" size={24} color={colors.accent} />
      </Pressable>
      <View style={styles.titles}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 12,
    marginRight: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Same height with or without a subtitle, so pages don't jump when switching.
  titles: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default ScreenHeader;
