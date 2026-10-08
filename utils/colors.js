/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * Design token color constants — v2
 * New teal/navy palette derived from the updated app icon.
 */

export const colors = {
  // ── Brand accent (existing) ──────────────────────────────────────────────
  accent:      '#2196F3',   // Material Blue 500 — primary interactive elements
  accentDark:  '#1976D2',   // Pressed / hero gradient end

  // ── New teal + navy palette (v2) ─────────────────────────────────────────
  teal:        '#00B4D8',   // Mid ring — new secondary accent
  tealDark:    '#0077B6',   // Hover / pressed teal
  navy:        '#1B3A6B',   // Inner ring — dark accent
  cyan100:     '#B2EBF2',   // Outer ring tint
  tealTint:    'rgba(0, 180, 216, 0.10)',  // Tinted backgrounds

  // ── Semantic status ───────────────────────────────────────────────────────
  success:     '#4CAF50',
  warning:     '#FF9800',
  danger:      '#F44336',
  gold:        '#FFD700',   // Bookmark star active

  // ── Light theme surfaces ──────────────────────────────────────────────────
  bg:          '#FFFFFF',
  bgAlt:       '#F5F7FA',
  bgMuted:     '#F5F5F5',
  border:      '#E0E0E0',
  borderSoft:  '#F0F0F0',

  // ── Dark theme surfaces ───────────────────────────────────────────────────
  bgDark:      '#0A0A0A',
  bgAltDark:   '#121212',
  bgMutedDark: '#1E1E1E',
  cardDark:    '#1A1A1A',
  borderDark:  '#333333',

  // ── Text ─────────────────────────────────────────────────────────────────
  fg:          '#1A1A1A',
  fgMuted:     '#666666',
  fgSubtle:    '#999999',
  fgDark:      '#E0E0E0',
  fgMutedDark: '#999999',
};
