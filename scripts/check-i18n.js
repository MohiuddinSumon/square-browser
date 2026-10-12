/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * Sanity checks for the translation files. Run with: npm run check:i18n
 *
 *  1. every language has exactly the keys of en.js (nothing missing, nothing extra)
 *  2. every translated string uses the same {{placeholders}} as the English one
 *  3. the translate() / plural / duration helpers behave as the UI expects
 */
import assert from 'node:assert/strict';
import en from '../i18n/en.js';
import ru from '../i18n/ru.js';
import pl from '../i18n/pl.js';
import de from '../i18n/de.js';
import { translate, pluralCategory, formatDuration, LANGUAGES, isSupportedLanguage } from '../i18n/index.js';

const OTHERS = { ru, pl, de };
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error('FAIL  ' + message);
};

/** Flattens a dictionary to { 'a.b.c': value }. Plural objects and arrays stay as leaves. */
const PLURAL_KEYS = ['one', 'few', 'many', 'other'];
const isPluralObject = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => PLURAL_KEYS.includes(k));

const flatten = (node, prefix = '', out = {}) => {
  Object.entries(node).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !isPluralObject(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  });
  return out;
};

/** All strings inside a leaf (a string, a plural object or an array of strings). */
const stringsOf = (leaf) => {
  if (typeof leaf === 'string') return [leaf];
  if (Array.isArray(leaf)) return leaf;
  return Object.values(leaf);
};

const placeholdersOf = (strings) =>
  [...new Set(strings.flatMap((s) => (s.match(/\{\{\w+\}\}/g) || [])))].sort().join(',');

const base = flatten(en);

Object.entries(OTHERS).forEach(([code, dictionary]) => {
  const flat = flatten(dictionary);

  Object.keys(base).forEach((key) => {
    if (!(key in flat)) fail(`${code}: missing key "${key}"`);
  });
  Object.keys(flat).forEach((key) => {
    if (!(key in base)) fail(`${code}: extra key "${key}" (not in en.js)`);
  });

  Object.keys(base).forEach((key) => {
    if (!(key in flat)) return;
    const english = base[key];
    const translated = flat[key];
    if (Array.isArray(english)) {
      if (!Array.isArray(translated) || translated.length !== english.length) {
        fail(`${code}: "${key}" must be a list of ${english.length} items`);
      }
      return;
    }
    const expected = placeholdersOf(stringsOf(english));
    const actual = placeholdersOf(stringsOf(translated));
    if (expected !== actual) fail(`${code}: "${key}" placeholders {${actual}} differ from en {${expected}}`);
    stringsOf(translated).forEach((s) => {
      if (typeof s !== 'string' || s.trim() === '') fail(`${code}: "${key}" has an empty string`);
    });
  });
});

// Plural categories for the languages that need more than one/other.
const expectPlural = (lang, count, expected) => {
  const actual = pluralCategory(lang, count);
  if (actual !== expected) fail(`pluralCategory(${lang}, ${count}) = ${actual}, expected ${expected}`);
};
[[1, 'one'], [2, 'few'], [4, 'few'], [5, 'many'], [11, 'many'], [12, 'many'], [21, 'one'], [22, 'few'], [25, 'many'], [101, 'one'], [111, 'many']]
  .forEach(([n, expected]) => expectPlural('ru', n, expected));
[[1, 'one'], [2, 'few'], [4, 'few'], [5, 'many'], [12, 'many'], [14, 'many'], [21, 'many'], [22, 'few'], [112, 'many']]
  .forEach(([n, expected]) => expectPlural('pl', n, expected));
[[0, 'other'], [1, 'one'], [2, 'other']].forEach(([n, expected]) => {
  expectPlural('en', n, expected);
  expectPlural('de', n, expected);
});

// translate() behaviour
try {
  assert.equal(translate('en', 'settings.title'), 'Settings');
  assert.equal(translate('ru', 'settings.title'), 'Настройки');
  assert.equal(translate('xx', 'settings.title'), 'Settings', 'unknown language falls back to English');
  assert.equal(translate('ru', 'no.such.key'), 'no.such.key', 'unknown key returns the key');
  assert.equal(translate('en', 'bookmarks.count', { count: 1 }), '1 bookmark');
  assert.equal(translate('en', 'bookmarks.count', { count: 3 }), '3 bookmarks');
  assert.equal(translate('ru', 'bookmarks.count', { count: 2 }), '2 закладки');
  assert.equal(translate('ru', 'bookmarks.count', { count: 5 }), '5 закладок');
  assert.equal(translate('pl', 'history.entries', { count: 22 }), '22 wpisy');
  assert.equal(translate('pl', 'history.entries', { count: 5 }), '5 wpisów');
  assert.equal(translate('de', 'history.entries', { count: 1 }), '1 Eintrag');
  assert.equal(translate('en', 'browser.limitCanExtend', { count: 1 }).includes('1 extension remaining'), true);
  assert.equal(translate('en', 'browser.externalMessage', { label: 'WhatsApp' }), 'This link wants to open another app (WhatsApp).');
  assert.equal(translate('en', 'browser.externalMessage'), 'This link wants to open another app ({{label}}).', 'missing variable stays visible');
  assert.equal(Array.isArray(translate('de', 'home.quotes')), true);
  assert.equal(translate('en', 'home.quotes').length, 30);

  const tEn = (k, v) => translate('en', k, v);
  const tRu = (k, v) => translate('ru', k, v);
  assert.equal(formatDuration(tEn, 20 * 60000), '20m');
  assert.equal(formatDuration(tEn, 80 * 60000), '1h 20m');
  assert.equal(formatDuration(tRu, 80 * 60000), '1 ч 20 мин');

  assert.equal(isSupportedLanguage('pl'), true);
  assert.equal(isSupportedLanguage('toString'), false, 'prototype keys are not languages');
  assert.deepEqual(LANGUAGES.map((l) => l.code), ['en', 'ru', 'pl', 'de']);
} catch (error) {
  fail(error.message);
}

if (failures > 0) {
  console.error(`\n${failures} problem(s) found.`);
  process.exit(1);
}
console.log(`i18n OK — ${Object.keys(base).length} keys x ${Object.keys(OTHERS).length + 1} languages.`);
