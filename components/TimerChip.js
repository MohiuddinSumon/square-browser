/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * TimerChip - Displays remaining daily browsing time in the address bar.
 * Pure presentational component — no context calls.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TimerChip = ({ remainingMs }) => {
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

  let chipColor;
  if (remainingMs <= 120000) {
    chipColor = '#F44336'; // red — ≤2 min
  } else if (remainingMs <= 600000) {
    chipColor = '#FF9800'; // amber — ≤10 min
  } else {
    chipColor = '#4CAF50'; // green
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
