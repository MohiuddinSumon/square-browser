/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * SettingsScreen.js — App settings & preferences.
 *
 * iOS HIG grouped-inset list. All colors/radii/shadows/typography derive from
 * theme.js tokens via getTheme(isDarkMode) — no hardcoded hex. Press feedback
 * uses Pressable style functions (scale 0.97 / opacity 0.6) with no haptics.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import Constants from 'expo-constants';
import { getTheme } from '../theme';

/**
 * ThemedSwitch — derives track/thumb colors from theme tokens instead of the
 * hardcoded RN defaults. Track is accent when on, separator-tinted when off;
 * thumb is white in both modes.
 */
const ThemedSwitch = ({ value, onValueChange, theme }) => {
  const { colors } = theme;
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.separator, true: colors.accent }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.separator}
    />
  );
};

const SettingsScreen = ({ navigation }) => {
  const {
    history,
    bookmarks,
    desktopMode,
    setDesktopMode,
    adBlockEnabled,
    setAdBlockEnabled,
    isDarkMode,
    toggleDarkMode,
    urlBarPosition,
    setUrlBarPositionPref,
    autoHideNavBar,
    setAutoHideNavBarPref,
    enhancedCompatEnabled,
    setEnhancedCompatPref,
    timerEnabled,
    dailyLimitMs,
    strictMode,
    setTimerSettingsPref,
  } = useBrowser();

  const theme = getTheme(isDarkMode);
  const { colors, spacing, borderRadius, typography, shadows, animation, touchTarget } = theme;

  const [appVersion, setAppVersion] = useState(Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0');
  const [localLimitMinutes, setLocalLimitMinutes] = useState(Math.round(dailyLimitMs / 60000));

  // Keep local picker in sync when context loads from AsyncStorage
  useEffect(() => {
    setLocalLimitMinutes(Math.round(dailyLimitMs / 60000));
  }, [dailyLimitMs]);

  const handleExportHistory = useCallback(() => {
    // Future: Implement export functionality
    alert('Export functionality will be available in a future update');
  }, []);

  const handleAbout = useCallback(() => {
    alert(
      'SquareBrowser\n\n' +
      'A mobile internet browser built for accountability and digital self-care.\n\n' +
      'Version: ' + appVersion + '\n\n' +
      'All browsing activity is logged and cannot be cleared or hidden.'
    );
  }, [appVersion]);

  // Pressable style function: transform-only press feedback, native driver friendly.
  const pressStyle = ({ pressed }) => [
    pressed && {
      transform: [{ scale: animation.pressScale }],
      opacity: animation.pressOpacity,
    },
  ];

  const renderPositionButton = (label, active, onPress) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.positionButton,
        {
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: active ? colors.accent : colors.surface,
        },
        pressed && {
          transform: [{ scale: animation.pressScale }],
          opacity: animation.pressOpacity,
        },
      ]}
    >
      <Text style={[styles.positionButtonText, { color: active ? colors.textOnPrimary : colors.textSecondary }]}>
        {label}
      </Text>
      {active && <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} style={styles.positionButtonCheck} />}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.groupedBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.separator }]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: animation.pressOpacity }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Browser Settings</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="desktop-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Desktop Mode</Text>
            </View>
            <ThemedSwitch value={desktopMode} onValueChange={setDesktopMode} theme={theme} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Ad Blocker</Text>
            </View>
            <ThemedSwitch value={adBlockEnabled} onValueChange={setAdBlockEnabled} theme={theme} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="globe-outline" size={22} color={colors.accent} />
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Enhanced Compatibility</Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Helps load sites with Cloudflare protection</Text>
              </View>
            </View>
            <ThemedSwitch value={enhancedCompatEnabled !== false} onValueChange={setEnhancedCompatPref} theme={theme} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={isDarkMode ? 'moon' : 'sunny-outline'} size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <ThemedSwitch value={isDarkMode} onValueChange={toggleDarkMode} theme={theme} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="code-working-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>URL Bar Position</Text>
            </View>
            <View style={styles.positionButtons}>
              {renderPositionButton('Top', urlBarPosition === 'top', () => setUrlBarPositionPref('top'))}
              {renderPositionButton('Bottom', urlBarPosition === 'bottom', () => setUrlBarPositionPref('bottom'))}
            </View>
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="eye-off-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Auto-Hide URL Bar</Text>
            </View>
            <ThemedSwitch value={autoHideNavBar} onValueChange={setAutoHideNavBarPref} theme={theme} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Daily Timer</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="timer-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Daily Browsing Limit</Text>
            </View>
            <ThemedSwitch
              value={timerEnabled}
              onValueChange={(val) => setTimerSettingsPref({ enabled: val, limitMs: localLimitMinutes * 60000, strict: strictMode })}
              theme={theme}
            />
          </Pressable>

          {timerEnabled && (
            <>
              <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

              <View style={styles.menuItemColumn}>
                <View style={[styles.menuItemLeft, { marginBottom: spacing.sm }]}>
                  <Ionicons name="hourglass-outline" size={22} color={colors.accent} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Time Limit</Text>
                </View>
                <View style={styles.timerPresets}>
                  {[30, 60, 120, 180, 360].map((mins) => (
                    <Pressable
                      key={mins}
                      onPress={() => {
                        setLocalLimitMinutes(mins);
                        setTimerSettingsPref({ enabled: true, limitMs: mins * 60000, strict: strictMode });
                      }}
                      style={({ pressed }) => [
                        styles.positionButton,
                        {
                          borderColor: localLimitMinutes === mins ? colors.accent : colors.border,
                          backgroundColor: localLimitMinutes === mins ? colors.accent : colors.surface,
                        },
                        pressed && {
                          transform: [{ scale: animation.pressScale }],
                          opacity: animation.pressOpacity,
                        },
                      ]}
                    >
                      <Text style={[styles.positionButtonText, { color: localLimitMinutes === mins ? colors.textOnPrimary : colors.textSecondary }]}>
                        {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                      </Text>
                      {localLimitMinutes === mins && (
                        <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} style={styles.positionButtonCheck} />
                      )}
                    </Pressable>
                  ))}
                </View>
                <View style={styles.timerAdjust}>
                  <Pressable
                    onPress={() => {
                      const newMins = Math.max(5, localLimitMinutes - 15);
                      setLocalLimitMinutes(newMins);
                      setTimerSettingsPref({ enabled: true, limitMs: newMins * 60000, strict: strictMode });
                    }}
                    style={({ pressed }) => [
                      styles.positionButton,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      pressed && {
                        transform: [{ scale: animation.pressScale }],
                        opacity: animation.pressOpacity,
                      },
                    ]}
                  >
                    <Text style={[styles.positionButtonText, { color: colors.textSecondary }]}>−15m</Text>
                  </Pressable>
                  <Text style={[styles.timerCurrentValue, { color: colors.text }]}>
                    {localLimitMinutes < 60
                      ? `${localLimitMinutes}m`
                      : localLimitMinutes % 60 === 0
                        ? `${localLimitMinutes / 60}h`
                        : `${Math.floor(localLimitMinutes / 60)}h ${localLimitMinutes % 60}m`}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const newMins = Math.min(1435, localLimitMinutes + 15);
                      setLocalLimitMinutes(newMins);
                      setTimerSettingsPref({ enabled: true, limitMs: newMins * 60000, strict: strictMode });
                    }}
                    style={({ pressed }) => [
                      styles.positionButton,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      pressed && {
                        transform: [{ scale: animation.pressScale }],
                        opacity: animation.pressOpacity,
                      },
                    ]}
                  >
                    <Text style={[styles.positionButtonText, { color: colors.textSecondary }]}>+15m</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

              <View style={styles.menuItemColumn}>
                <View style={styles.menuItemRow}>
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="lock-closed-outline" size={22} color={colors.accent} />
                    <Text style={[styles.menuItemText, { color: colors.text }]}>Strict Mode</Text>
                  </View>
                  <ThemedSwitch
                    value={strictMode}
                    onValueChange={(val) => setTimerSettingsPref({ enabled: true, limitMs: localLimitMinutes * 60000, strict: val })}
                    theme={theme}
                  />
                </View>
                <Text style={[styles.menuItemSubtext, { color: colors.warning }]}>
                  Browser locks until midnight — cannot be bypassed.
                </Text>
              </View>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Access</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => navigation.navigate('History')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="time-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Browsing History</Text>
            </View>
            <View style={styles.menuItemRight}>
              <View style={[styles.buttonBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.buttonBadgeText}>{history.length}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => navigation.navigate('Bookmarks')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Bookmarks</Text>
            </View>
            <View style={styles.menuItemRight}>
              <View style={[styles.buttonBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.buttonBadgeText}>{bookmarks.length}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => navigation.navigate('Products')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="apps-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Products</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={handleExportHistory}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="share-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Export History</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About & Legal</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-half-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <View style={styles.aboutContainer}>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              SquareBrowser is a mobile internet browser built for those who want to reclaim control over their digital habits.
              With no incognito or hidden modes, SquareBrowser ensures complete transparency in all your online activity.
            </Text>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              Your history is permanent and your time is precious. Every minute you spend here is recorded for your own accountability.
            </Text>
          </View>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Name</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>SquareBrowser</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{appVersion}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>Active Accountability</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          SquareBrowser v{appVersion} • Honest Browsing
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 12,
    marginRight: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemColumn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  menuItemTextWrap: {
    flexShrink: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuItemText: {
    fontSize: 17,
  },
  menuItemSubtext: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 17,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  buttonBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  buttonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  aboutContainer: {
    padding: 16,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  infoSection: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  positionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  positionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  positionButtonCheck: {
    marginLeft: 2,
  },
  positionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  timerAdjust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerCurrentValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },
});

export default SettingsScreen;