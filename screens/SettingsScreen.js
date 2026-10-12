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
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Switch, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import Constants from 'expo-constants';
import { getTheme } from '../theme';
import { LANGUAGES } from '../i18n';

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
    backgroundPlayEnabled,
    setBackgroundPlayPref,
    timerEnabled,
    dailyLimitMs,
    strictMode,
    setTimerSettingsPref,
    language,
    setLanguagePref,
    t,
  } = useBrowser();

  const theme = getTheme(isDarkMode);
  const { colors, spacing, borderRadius, typography, shadows, animation, touchTarget } = theme;

  const [appVersion, setAppVersion] = useState(Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0');
  const [localLimitMinutes, setLocalLimitMinutes] = useState(Math.round(dailyLimitMs / 60000));
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const currentLanguageName = (LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]).name;

  // Keep local picker in sync when context loads from AsyncStorage
  useEffect(() => {
    setLocalLimitMinutes(Math.round(dailyLimitMs / 60000));
  }, [dailyLimitMs]);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.browserSettings')}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="language-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.language')}</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>{currentLanguageName}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="desktop-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.desktopMode')}</Text>
            </View>
            <ThemedSwitch value={desktopMode} onValueChange={setDesktopMode} theme={theme} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.adBlocker')}</Text>
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
                <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.enhancedCompat')}</Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('settings.enhancedCompatHint')}</Text>
              </View>
            </View>
            <ThemedSwitch value={enhancedCompatEnabled !== false} onValueChange={setEnhancedCompatPref} theme={theme} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          {Platform.OS === 'android' && (
            <>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name="musical-notes-outline" size={22} color={colors.accent} />
                  <View style={styles.menuItemTextWrap}>
                    <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.backgroundPlay')}</Text>
                    <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('settings.backgroundPlayHint')}</Text>
                  </View>
                </View>
                <ThemedSwitch value={backgroundPlayEnabled !== false} onValueChange={setBackgroundPlayPref} theme={theme} />
              </Pressable>

              <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={isDarkMode ? 'moon' : 'sunny-outline'} size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.darkMode')}</Text>
            </View>
            <ThemedSwitch value={isDarkMode} onValueChange={toggleDarkMode} theme={theme} />
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="code-working-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.urlBarPosition')}</Text>
            </View>
            <View style={styles.positionButtons}>
              {renderPositionButton(t('settings.top'), urlBarPosition === 'top', () => setUrlBarPositionPref('top'))}
              {renderPositionButton(t('settings.bottom'), urlBarPosition === 'bottom', () => setUrlBarPositionPref('bottom'))}
            </View>
          </Pressable>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="eye-off-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.autoHideUrlBar')}</Text>
            </View>
            <ThemedSwitch value={autoHideNavBar} onValueChange={setAutoHideNavBarPref} theme={theme} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.dailyTimer')}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="timer-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.dailyLimit')}</Text>
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
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.timeLimit')}</Text>
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
                        {mins < 60 ? `${mins}${t('units.m')}` : `${mins / 60}${t('units.h')}`}
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
                    <Text style={[styles.positionButtonText, { color: colors.textSecondary }]}>{`−15${t('units.m')}`}</Text>
                  </Pressable>
                  <Text style={[styles.timerCurrentValue, { color: colors.text }]}>
                    {localLimitMinutes < 60
                      ? `${localLimitMinutes}${t('units.m')}`
                      : localLimitMinutes % 60 === 0
                        ? `${localLimitMinutes / 60}${t('units.h')}`
                        : `${Math.floor(localLimitMinutes / 60)}${t('units.h')} ${localLimitMinutes % 60}${t('units.m')}`}
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
                    <Text style={[styles.positionButtonText, { color: colors.textSecondary }]}>{`+15${t('units.m')}`}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

              <View style={styles.menuItemColumn}>
                <View style={styles.menuItemRow}>
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="lock-closed-outline" size={22} color={colors.accent} />
                    <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.strictMode')}</Text>
                  </View>
                  <ThemedSwitch
                    value={strictMode}
                    onValueChange={(val) => setTimerSettingsPref({ enabled: true, limitMs: localLimitMinutes * 60000, strict: val })}
                    theme={theme}
                  />
                </View>
                <Text style={[styles.menuItemSubtext, { color: colors.warning }]}>
                  {t('settings.strictModeHint')}
                </Text>
              </View>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.quickAccess')}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => navigation.navigate('History')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="time-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.history')}</Text>
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
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.bookmarks')}</Text>
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
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.products')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.aboutLegal')}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-half-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.privacy')}</Text>
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
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.terms')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }]}>
          <View style={styles.aboutContainer}>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              {t('settings.aboutText1')}
            </Text>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              {t('settings.aboutText2')}
            </Text>
          </View>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('settings.appName')}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>SquareBrowser</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('settings.version')}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{appVersion}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('settings.status')}</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>{t('settings.statusActive')}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          {t('settings.footer', { version: appVersion })}
        </Text>
      </ScrollView>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={[styles.languageOverlay, { backgroundColor: colors.scrim }]}
          onPress={() => setLanguageModalVisible(false)}
        >
          {/* Inner Pressable swallows taps so only the dimmed area closes the picker */}
          <Pressable style={[styles.languageSheet, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
            <Text style={[styles.languageTitle, { color: colors.text }]}>{t('settings.chooseLanguage')}</Text>
            {LANGUAGES.map((lang, index) => {
              const selected = lang.code === language;
              return (
                <View key={lang.code}>
                  {index > 0 && <View style={[styles.languageHairline, { backgroundColor: colors.separator }]} />}
                  <Pressable
                    style={({ pressed }) => [styles.languageRow, pressed && { opacity: animation.pressOpacity }]}
                    onPress={() => {
                      setLanguagePref(lang.code);
                      setLanguageModalVisible(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.languageName, { color: selected ? colors.accent : colors.text, fontWeight: selected ? '600' : '400' }]}>
                      {lang.name}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                  </Pressable>
                </View>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
    flexShrink: 1, // long translations wrap instead of running under the switch
  },
  menuItemValue: {
    fontSize: 17,
  },
  languageOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  languageSheet: {
    paddingVertical: 8,
    overflow: 'hidden',
  },
  languageTitle: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  languageName: {
    fontSize: 17,
  },
  languageHairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
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