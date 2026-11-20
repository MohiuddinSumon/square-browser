/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * ProtectionGate — the one place that asks for the partner's PIN or explains the 24-hour
 * wait when the commitment lock holds back a change (see utils/protection.js).
 *
 *   const [requestChange, gate] = useProtectedChange();
 *   const status = await requestChange('timer', nextValue); // 'applied' | 'pending' | 'cancelled'
 *   ...render {gate} somewhere in the screen.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet, Alert } from 'react-native';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';
import { formatClock, formatLongDate } from '../i18n';

export const useProtectedChange = () => {
  const { requestProtectionChange, cancelPendingChange, isDarkMode, language, t } = useBrowser();
  const { colors, borderRadius, animation } = getTheme(isDarkMode);
  const [pinRequest, setPinRequest] = useState(null); // { type, value }
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const resolver = useRef(null);

  const finish = (status) => {
    setPinRequest(null);
    setPin('');
    setError(false);
    if (resolver.current) resolver.current(status);
    resolver.current = null;
  };

  const explainPending = useCallback((type, applyAt) => {
    const when = new Date(applyAt);
    Alert.alert(
      t('commitment.pendingTitle'),
      t('commitment.pendingMessage', { date: formatLongDate(language, when), time: formatClock(language, when) }),
      [
        { text: t('commitment.undo'), style: 'cancel', onPress: () => cancelPendingChange(type) },
        { text: t('common.ok') },
      ],
    );
  }, [cancelPendingChange, language, t]);

  const requestChange = useCallback(async (type, value) => {
    const result = await requestProtectionChange(type, value);
    if (result.status === 'pending') {
      explainPending(type, result.applyAt);
      return 'pending';
    }
    if (result.status === 'needPin') {
      return new Promise((resolve) => {
        resolver.current = resolve;
        setPinRequest({ type, value });
      });
    }
    return result.status;
  }, [requestProtectionChange, explainPending]);

  const submitPin = async () => {
    const result = await requestProtectionChange(pinRequest.type, pinRequest.value, { pin });
    if (result.status === 'badPin') {
      setError(true);
      setPin('');
      return;
    }
    finish(result.status);
  };

  const waitInstead = async () => {
    const { type, value } = pinRequest;
    const result = await requestProtectionChange(type, value, { wait: true });
    finish(result.status);
    if (result.status === 'pending') explainPending(type, result.applyAt);
  };

  const button = (label, onPress, primary) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? colors.accent : colors.surfaceAlt, borderRadius: borderRadius.sm },
        pressed && { opacity: animation.pressOpacity },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? colors.textOnPrimary : colors.accent }]}>{label}</Text>
    </Pressable>
  );

  const gate = (
    <Modal visible={pinRequest != null} transparent animationType="fade" onRequestClose={() => finish('cancelled')}>
      <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('commitment.pinTitle')}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{t('commitment.pinMessage')}</Text>
          <TextInput
            value={pin}
            onChangeText={(text) => { setPin(text.replace(/\D/g, '').slice(0, 8)); setError(false); }}
            keyboardType="number-pad"
            secureTextEntry
            autoFocus
            maxLength={8}
            style={[styles.input, { color: colors.text, borderColor: error ? colors.danger : colors.border, borderRadius: borderRadius.sm }]}
            placeholder="••••"
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={submitPin}
          />
          {error && <Text style={[styles.error, { color: colors.danger }]}>{t('commitment.wrongPin')}</Text>}
          {button(t('commitment.unlock'), submitPin, true)}
          {button(t('commitment.waitInstead'), waitInstead, false)}
          {button(t('common.cancel'), () => finish('cancelled'), false)}
        </View>
      </View>
    </Modal>
  );

  return [requestChange, gate];
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
  },
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
