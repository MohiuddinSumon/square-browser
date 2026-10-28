/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * AccountabilityScreen.js — schedules, the block list / SafeSearch, the commitment lock and
 * the weekly summary for an accountability partner.
 *
 * Every change goes through useProtectedChange (components/ProtectionGate.js), so the
 * commitment lock can hold back changes that make limits weaker. Rules live in
 * utils/protection.js.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Switch, Modal, TextInput, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { useProtectedChange } from '../components/ProtectionGate';
import { formatClock, formatLongDate } from '../i18n';
import {
  validateSchedules, formatMinutes, normalizeDomain, makeSalt, hashPin, isValidPin, MAX_SCHEDULES,
} from '../utils/protection';
import { buildWeeklySummary } from '../utils/exportData';
import { loadAllUsage } from '../utils/storage';

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

const COMMITMENT_MODES = ['off', 'delay', 'pin'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const AccountabilityScreen = ({ navigation }) => {
  const {
    schedules,
    blocking,
    commitment,
    pendingChanges,
    cancelPendingChange,
    timerEnabled,
    dailyLimitMs,
    strictMode,
    isDarkMode,
    language,
    t,
  } = useBrowser();
  const theme = getTheme(isDarkMode);
  const { colors, borderRadius, shadows, animation } = theme;
  const [requestChange, protectionGate] = useProtectedChange();

  const [editing, setEditing] = useState(null); // schedule being edited, or null
  const [siteInput, setSiteInput] = useState('');
  const [pinSetup, setPinSetup] = useState(null); // { pin, confirm, error }

  const dayNames = t('schedules.days');
  const describeDays = (days) =>
    days.length === 7 ? t('schedules.everyDay') : [...days].sort().map((d) => dayNames[d]).join(', ');

  // ---- Commitment lock ----
  const chooseMode = (mode) => {
    if (mode === commitment.mode) return;
    if (mode === 'pin') {
      setPinSetup({ pin: '', confirm: '', error: null });
      return;
    }
    requestChange('commitment', { mode, pinHash: null, salt: null });
  };

  const savePin = async () => {
    if (!isValidPin(pinSetup.pin)) {
      setPinSetup({ ...pinSetup, error: t('commitment.pinInvalid') });
      return;
    }
    if (pinSetup.pin !== pinSetup.confirm) {
      setPinSetup({ ...pinSetup, error: t('commitment.pinMismatch') });
      return;
    }
    const salt = makeSalt();
    const pin = pinSetup.pin;
    setPinSetup(null);
    await requestChange('commitment', { mode: 'pin', salt, pinHash: hashPin(pin, salt) });
  };

  // ---- Schedules ----
  const saveSchedules = async (next) => {
    const error = validateSchedules(next);
    if (error) {
      Alert.alert(t('schedules.title'), t(error));
      return false;
    }
    await requestChange('schedules', next);
    return true;
  };

  const startNewSchedule = () => {
    if (schedules.length >= MAX_SCHEDULES) {
      Alert.alert(t('schedules.title'), t('schedules.errorTooMany'));
      return;
    }
    setEditing({ id: null, enabled: true, start: 23 * 60, end: 6 * 60, days: [...ALL_DAYS] });
  };

  const saveEditing = async () => {
    const schedule = { ...editing, id: editing.id || Date.now().toString(36) };
    const next = editing.id
      ? schedules.map((s) => (s.id === editing.id ? schedule : s))
      : [...schedules, schedule];
    if (await saveSchedules(next)) setEditing(null);
  };

  const deleteEditing = async () => {
    const next = schedules.filter((s) => s.id !== editing.id);
    setEditing(null);
    await requestChange('schedules', next);
  };

  const shiftTime = (field, delta) => {
    setEditing((e) => ({ ...e, [field]: (e[field] + delta + 1440) % 1440 }));
  };

  const toggleDay = (day) => {
    setEditing((e) => ({
      ...e,
      days: e.days.includes(day) ? e.days.filter((d) => d !== day) : [...e.days, day],
    }));
  };

  // ---- Block list ----
  const addSite = () => {
    const domain = normalizeDomain(siteInput);
    if (!domain) {
      Alert.alert(t('blocking.sites'), t('blocking.invalidDomain'));
      return;
    }
    setSiteInput('');
    if (blocking.sites.includes(domain)) return;
    requestChange('blocking', { ...blocking, sites: [...blocking.sites, domain] });
  };

  // ---- Weekly summary ----
  const sendSummary = async () => {
    const usage = await loadAllUsage();
    const message = buildWeeklySummary(t, usage, {
      timerEnabled,
      dailyLimitMs,
      strictMode,
      scheduleCount: schedules.filter((s) => s.enabled).length,
      blockedSiteCount: blocking.sites.length,
      adult: blocking.adult,
      safeSearch: blocking.safeSearch,
      commitmentMode: commitment.mode,
    });
    Share.share({ message });
  };

  const hairline = <View style={[styles.hairline, { backgroundColor: colors.separator }]} />;
  const card = [styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm }];
  const pressRow = ({ pressed }) => [styles.menuItem, pressed && { opacity: animation.pressOpacity }];

  const smallButton = (label, onPress, key) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        { borderColor: colors.border, backgroundColor: colors.surface },
        pressed && { transform: [{ scale: animation.pressScale }], opacity: animation.pressOpacity },
      ]}
    >
      <Text style={[styles.smallButtonText, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.groupedBackground }]}>
      <ScreenHeader title={t('accountability.title')} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Commitment lock */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('commitment.title')}</Text>
        <View style={card}>
          {COMMITMENT_MODES.map((mode, index) => {
            const selected = commitment.mode === mode;
            return (
              <View key={mode}>
                {index > 0 && hairline}
                <Pressable
                  style={pressRow}
                  onPress={() => chooseMode(mode)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.menuItemTextWrap}>
                    <Text style={[styles.menuItemText, { color: selected ? colors.accent : colors.text }]}>{t('commitment.mode_' + mode)}</Text>
                    <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('commitment.mode_' + mode + 'Hint')}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                </Pressable>
              </View>
            );
          })}
        </View>
        <Text style={[styles.footnote, { color: colors.textSecondary }]}>{t('commitment.hint')}</Text>

        {pendingChanges.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('commitment.pendingSection')}</Text>
            <View style={card}>
              {pendingChanges.map((change, index) => {
                const when = new Date(change.applyAt);
                return (
                  <View key={change.type}>
                    {index > 0 && hairline}
                    <View style={styles.menuItem}>
                      <View style={styles.menuItemTextWrap}>
                        <Text style={[styles.menuItemText, { color: colors.text }]}>{t('commitment.change_' + change.type)}</Text>
                        <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>
                          {t('commitment.pendingApplies', { date: formatLongDate(language, when), time: formatClock(language, when) })}
                        </Text>
                      </View>
                      {smallButton(t('commitment.undo'), () => cancelPendingChange(change.type))}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Schedules */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('schedules.title')}</Text>
        <View style={card}>
          {schedules.length === 0 && (
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('schedules.empty')}</Text>
            </View>
          )}
          {schedules.map((s, index) => (
            <View key={s.id}>
              {index > 0 && hairline}
              <Pressable style={pressRow} onPress={() => setEditing({ ...s, days: [...s.days] })}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="moon-outline" size={22} color={colors.accent} />
                  <View style={styles.menuItemTextWrap}>
                    <Text style={[styles.menuItemText, { color: colors.text }]}>{`${formatMinutes(s.start)} – ${formatMinutes(s.end)}`}</Text>
                    <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{describeDays(s.days)}</Text>
                  </View>
                </View>
                <ThemedSwitch
                  value={s.enabled}
                  onValueChange={(enabled) => saveSchedules(schedules.map((x) => (x.id === s.id ? { ...x, enabled } : x)))}
                  theme={theme}
                />
              </Pressable>
            </View>
          ))}
          {hairline}
          <Pressable style={pressRow} onPress={startNewSchedule}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.accent }]}>{t('schedules.add')}</Text>
            </View>
          </Pressable>
        </View>
        <Text style={[styles.footnote, { color: colors.textSecondary }]}>{t('schedules.hint')}</Text>

        {/* Blocking */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('blocking.title')}</Text>
        <View style={card}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="eye-off-outline" size={22} color={colors.accent} />
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>{t('blocking.adult')}</Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('blocking.adultHint')}</Text>
              </View>
            </View>
            <ThemedSwitch value={blocking.adult} onValueChange={(adult) => requestChange('blocking', { ...blocking, adult })} theme={theme} />
          </View>
          {hairline}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="search-outline" size={22} color={colors.accent} />
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>{t('blocking.safeSearch')}</Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('blocking.safeSearchHint')}</Text>
              </View>
            </View>
            <ThemedSwitch value={blocking.safeSearch} onValueChange={(safeSearch) => requestChange('blocking', { ...blocking, safeSearch })} theme={theme} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('blocking.sites')}</Text>
        <View style={card}>
          {blocking.sites.length === 0 && (
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('blocking.empty')}</Text>
            </View>
          )}
          {blocking.sites.map((site, index) => (
            <View key={site}>
              {index > 0 && hairline}
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="ban-outline" size={22} color={colors.danger} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{site}</Text>
                </View>
                <Pressable
                  onPress={() => requestChange('blocking', { ...blocking, sites: blocking.sites.filter((d) => d !== site) })}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.remove')}
                >
                  <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                </Pressable>
              </View>
            </View>
          ))}
          {hairline}
          <View style={styles.addRow}>
            <TextInput
              value={siteInput}
              onChangeText={setSiteInput}
              placeholder={t('blocking.addPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onSubmitEditing={addSite}
              style={[styles.addInput, { color: colors.text, borderColor: colors.border, borderRadius: borderRadius.sm }]}
            />
            {smallButton(t('blocking.add'), addSite)}
          </View>
        </View>

        {/* Weekly summary */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('summary.title')}</Text>
        <View style={card}>
          <Pressable style={pressRow} onPress={sendSummary}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="paper-plane-outline" size={22} color={colors.accent} />
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>{t('summary.send')}</Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('summary.sendHint')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Schedule editor */}
      <Modal visible={editing != null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
          {editing && (
            <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t(editing.id ? 'schedules.edit' : 'schedules.add')}</Text>
              {['start', 'end'].map((field) => (
                <View key={field} style={styles.timeRow}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{t('schedules.' + field)}</Text>
                  {smallButton('−1' + t('units.h'), () => shiftTime(field, -60))}
                  {smallButton('−5' + t('units.m'), () => shiftTime(field, -5))}
                  <Text style={[styles.timeValue, { color: colors.text }]}>{formatMinutes(editing[field])}</Text>
                  {smallButton('+5' + t('units.m'), () => shiftTime(field, 5))}
                  {smallButton('+1' + t('units.h'), () => shiftTime(field, 60))}
                </View>
              ))}
              <View style={styles.dayRow}>
                {ALL_DAYS.map((day) => {
                  const on = editing.days.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[styles.dayChip, { backgroundColor: on ? colors.accent : colors.surfaceAlt }]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Text style={[styles.dayChipText, { color: on ? colors.textOnPrimary : colors.textSecondary }]}>{dayNames[day]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.sheetButtons}>
                {editing.id && smallButton(t('schedules.delete'), deleteEditing, 'delete')}
                <View style={{ flex: 1 }} />
                {smallButton(t('common.cancel'), () => setEditing(null), 'cancel')}
                {smallButton(t('schedules.save'), saveEditing, 'save')}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Set PIN */}
      <Modal visible={pinSetup != null} transparent animationType="fade" onRequestClose={() => setPinSetup(null)}>
        <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
          {pinSetup && (
            <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('commitment.setPinTitle')}</Text>
              <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{t('commitment.setPinMessage')}</Text>
              {['pin', 'confirm'].map((field) => (
                <TextInput
                  key={field}
                  value={pinSetup[field]}
                  onChangeText={(text) => setPinSetup({ ...pinSetup, [field]: text.replace(/\D/g, '').slice(0, 8), error: null })}
                  placeholder={field === 'pin' ? '••••' : t('commitment.confirmPin')}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  style={[styles.pinInput, { color: colors.text, borderColor: colors.border, borderRadius: borderRadius.sm }]}
                />
              ))}
              {pinSetup.error && <Text style={[styles.menuItemSubtext, { color: colors.danger }]}>{pinSetup.error}</Text>}
              <View style={styles.sheetButtons}>
                <View style={{ flex: 1 }} />
                {smallButton(t('common.cancel'), () => setPinSetup(null), 'cancel')}
                {smallButton(t('schedules.save'), savePin, 'save')}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {protectionGate}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -12,
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
    gap: 12,
    minHeight: 44,
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
  menuItemText: {
    fontSize: 17,
    flexShrink: 1,
  },
  menuItemSubtext: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 17,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  smallButton: {
    flexShrink: 0,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  addInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheet: {
    padding: 16,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  timeLabel: {
    width: '100%',
    fontSize: 14,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '600',
    minWidth: 64,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    minWidth: 40,
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
  },
});

export default AccountabilityScreen;
