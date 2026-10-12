/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * TimerChip - Displays remaining daily browsing time in the address bar.
 * Pure presentational component — no context calls (the parent passes `t` for the unit labels).
 */
import { getTheme } from '../theme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TimerChip = ({ remainingMs, t }) => {
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  let displayText;
  if (remainingMs >= 3600000) {
    const hours = Math.floor(remainingMs / 3600000);
    const mins = Math.floor((remainingMs % 3600000) / 60000);
    displayText = mins > 0
      ? `${hours}${t('units.h')} ${mins}${t('units.m')}`
      : `${hours}${t('units.h')}`;
  } else if (remainingMs >= 60000) {
    displayText = `${minutes}${t('units.m')}`;
  } else {
    displayText = `${seconds}${t('units.s')}`;
  }

  let chipColor;
  if (remainingMs <= 120000) {
    chipColor = getTheme(false).colors.danger; // red — ≤2 min
  } else if (remainingMs <= 600000) {
    chipColor = getTheme(false).colors.warning; // amber — ≤10 min
  } else {
    chipColor = getTheme(false).colors.success; // green
  }

  return (
    <View style={[styles.chip, { borderColor: chipColor, backgroundColor: chipColor + '22' }]}>
      <Text style={[styles.chipText, { color: chipColor }]}>{displayText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default TimerChip;
