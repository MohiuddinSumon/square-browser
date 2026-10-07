/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * TimerChip - Displays remaining daily browsing time in the address bar.
 * Pure presentational component — no context calls. Derives its palette from
 * the centralized theme tokens via getTheme(isDarkMode).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import getTheme from '../theme';

// Safe alpha helper: appends an alpha channel to a #RRGGBB hex color and
// always returns a valid rgba() string. Never concatenate hex + alpha.
const withAlpha = (hex, alpha) => {
  if (typeof hex === 'string' && hex.startsWith('rgba')) {
    return hex; // already an rgba() token — use as-is
  }
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const TimerChip = ({ remainingMs, isDarkMode = false }) => {
  const theme = getTheme(isDarkMode);
  const { colors, typography, spacing, borderRadius } = theme;

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  let displayText;
  if (remainingMs >= 3600000) {
    const hours = Math.floor(remainingMs / 3600000);
    const mins = Math.floor((remainingMs % 3600000) / 60000);
    displayText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else if (remainingMs >= 60000) {
    displayText = `${minutes}m`;
  } else {
    displayText = `${seconds}s`;
  }

  // Expired / zero state — distinct "Limit reached" pill.
  if (remainingMs <= 0) {
    return (
      <View
        style={[styles.chip, { backgroundColor: colors.danger, borderColor: colors.danger }]}
        accessibilityLabel="Limit reached. Daily browsing time is up."
        accessibilityRole="text"
      >
        <Ionicons name="lock-closed" size={12} color={colors.textOnPrimary} />
        <Text style={[styles.chipText, { color: colors.textOnPrimary, marginLeft: 4 }]}>
          Limit reached
        </Text>
      </View>
    );
  }

  let chipColor;
  if (remainingMs <= 120000) {
    chipColor = colors.danger; // red — ≤2 min
  } else if (remainingMs <= 600000) {
    chipColor = colors.warning; // amber — ≤10 min
  } else {
    chipColor = colors.success; // green
  }

  const minutesLabel = Math.max(1, Math.ceil(remainingMs / 60000));

  return (
    <View
      style={[styles.chip, { borderColor: chipColor, backgroundColor: withAlpha(chipColor, 0.13) }]}
      accessibilityLabel={`Remaining browsing time: ${minutesLabel} minutes`}
      accessibilityRole="text"
    >
      <Text style={[styles.chipText, { color: chipColor }]}>{displayText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TimerChip;