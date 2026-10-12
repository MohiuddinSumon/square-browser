/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * i18n/index.js — tiny translation layer.
 *
 * English is the source of truth and the default: the app never follows the device language,
 * the user opts in from Settings. Any key missing from another language falls back to English.
 *
 * Everything here is pure (no React, no storage) so it can be checked with plain Node
 * (see scripts/check-i18n.js). BrowserContext owns the selected language and exposes `t`.
 */
import en from './en.js';
import ru from './ru.js';
import pl from './pl.js';
import de from './de.js';

export const DEFAULT_LANGUAGE = 'en';

// `name` is always written in the language itself so people can find theirs.
export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'ru', name: 'Русский', locale: 'ru-RU' },
  { code: 'pl', name: 'Polski', locale: 'pl-PL' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
];

const DICTIONARIES = { en, ru, pl, de };

export const isSupportedLanguage = (code) =>
  Object.prototype.hasOwnProperty.call(DICTIONARIES, code);

/**
 * CLDR plural category for a count. Hand-written for the four shipped languages so it does
 * not depend on Intl.PluralRules being available in the JS engine.
 */
export const pluralCategory = (lang, count) => {
  const n = Math.abs(Number(count));
  if (!Number.isInteger(n)) return 'other';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (lang === 'ru') {
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  }
  if (lang === 'pl') {
    if (n === 1) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  }
  // English and German
  return n === 1 ? 'one' : 'other';
};

const lookup = (dictionary, key) =>
  key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dictionary);

const interpolate = (text, vars) =>
  text.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    vars && vars[name] != null ? String(vars[name]) : match
  );

/**
 * Translates `key` into `lang`.
 *  - plain string: `{{name}}` placeholders are filled from `vars`
 *  - object with one/few/many/other: the form for `vars.count` is chosen first
 *  - array: returned as-is (used for the list of quotes)
 * Unknown keys return the key itself so a typo is visible instead of blank.
 */
export const translate = (lang, key, vars) => {
  let value = lookup(DICTIONARIES[lang] || en, key);
  if (value === undefined) value = lookup(en, key);
  if (value === undefined) return key;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    const count = vars ? vars.count : undefined;
    value = value[pluralCategory(lang, count)] || value.other;
  }
  return typeof value === 'string' ? interpolate(value, vars) : key;
};

/** "1h 20m" style duration; the unit labels (and any spacing) come from the language. */
export const formatDuration = (t, ms) => {
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}${t('units.h')} ${mins % 60}${t('units.m')}`;
  return `${mins}${t('units.m')}`;
};

const localeOf = (lang) => {
  const entry = LANGUAGES.find((l) => l.code === lang);
  return entry ? entry.locale : 'en-US';
};

/** "October 13, 2026" in the language's own format (falls back to English on engines without data). */
export const formatLongDate = (lang, date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  try {
    return date.toLocaleDateString(localeOf(lang), options);
  } catch (e) {
    return date.toLocaleDateString('en-US', options);
  }
};

export const formatClock = (lang, date) => {
  const options = { hour: '2-digit', minute: '2-digit' };
  try {
    return date.toLocaleTimeString(localeOf(lang), options);
  } catch (e) {
    return date.toLocaleTimeString('en-US', options);
  }
};
