/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * Checks for the accountability rules (utils/protection.js) and data export/import (utils/exportData.js). Run with: npm run check:protection
 */
import assert from 'node:assert/strict';
import {
  scheduleBlockUntil, validateSchedules, isLoosening, getBlockReason, enforceSafeSearch,
  normalizeDomain, hashPin, checkPin, formatMinutes,
} from '../utils/protection.js';
import { formatInputUrl } from '../utils/url.js';
import { historyToCsv, bookmarksToHtml, parseBookmarks, buildWeeklySummary, lastSevenDays } from '../utils/exportData.js';
import { translate } from '../i18n/index.js';

let failures = 0;
const check = (name, fn) => {
  try { fn(); } catch (e) { failures += 1; console.error(`FAIL  ${name}: ${e.message}`); }
};

// Local dates: 2026-10-26 is a Monday.
const at = (day, hh, mm) => new Date(2026, 9, 25 + day, hh, mm, 30);
const night = { id: 'n', enabled: true, start: 23 * 60, end: 6 * 60, days: [0, 1, 2, 3, 4, 5, 6] };
const study = { id: 's', enabled: true, start: 9 * 60, end: 12 * 60, days: [1, 2, 3, 4, 5] };

check('schedules', () => {
  assert.equal(scheduleBlockUntil([study], at(1, 8, 59)), null);
  assert.deepEqual(scheduleBlockUntil([study], at(1, 9, 0)), new Date(2026, 9, 26, 12, 0));
  assert.equal(scheduleBlockUntil([study], at(0, 10, 0)), null, 'Sunday is not a study day');
  assert.deepEqual(scheduleBlockUntil([night], at(1, 23, 30)), new Date(2026, 9, 27, 6, 0), 'runs past midnight');
  assert.deepEqual(scheduleBlockUntil([night], at(1, 2, 0)), new Date(2026, 9, 26, 6, 0), 'started the night before');
  assert.equal(scheduleBlockUntil([{ ...night, enabled: false }], at(1, 2, 0)), null);
  const chained = [{ id: 'a', enabled: true, start: 600, end: 660, days: [1] }, { id: 'b', enabled: true, start: 660, end: 720, days: [1] }];
  assert.deepEqual(scheduleBlockUntil(chained, at(1, 10, 15)), new Date(2026, 9, 26, 12, 0), 'back-to-back windows merge');
  assert.equal(formatMinutes(23 * 60 + 5), '23:05');
});

check('schedule validation', () => {
  assert.equal(validateSchedules([night, study]), null);
  assert.equal(validateSchedules([{ ...study, end: study.start }]), 'schedules.errorSameTime');
  assert.equal(validateSchedules([{ ...study, days: [] }]), 'schedules.errorNoDays');
  assert.equal(validateSchedules([{ id: 'x', enabled: true, start: 60, end: 23 * 60, days: [1] }]), 'schedules.errorTooLong');
  assert.equal(validateSchedules([{ id: 'x', enabled: true, start: 6 * 60, end: 3 * 60, days: [3] }]), 'schedules.errorTooLong', '21h overnight window');
  assert.equal(validateSchedules([{ id: 'x', enabled: true, start: 6 * 60, end: 2 * 60, days: [3] }]), null, '20h is the most allowed');
});

check('loosening', () => {
  const timer = { enabled: true, dailyLimitMs: 3600000, strictMode: true };
  assert.equal(isLoosening('timer', timer, { ...timer, dailyLimitMs: 1800000 }), false);
  assert.equal(isLoosening('timer', timer, { ...timer, dailyLimitMs: 7200000 }), true);
  assert.equal(isLoosening('timer', timer, { ...timer, strictMode: false }), true);
  assert.equal(isLoosening('timer', timer, { ...timer, enabled: false }), true);
  assert.equal(isLoosening('timer', { ...timer, enabled: false }, timer), false);
  assert.equal(isLoosening('schedules', [study], [study, night]), false);
  assert.equal(isLoosening('schedules', [study, night], [study]), true);
  assert.equal(isLoosening('schedules', [study], [{ ...study, end: 11 * 60 }]), true);
  assert.equal(isLoosening('schedules', [study], [{ ...study, enabled: false }]), true);
  const blocking = { sites: ['a.com'], adult: true, safeSearch: true };
  assert.equal(isLoosening('blocking', blocking, { ...blocking, sites: ['a.com', 'b.com'] }), false);
  assert.equal(isLoosening('blocking', blocking, { ...blocking, sites: [] }), true);
  assert.equal(isLoosening('blocking', blocking, { ...blocking, adult: false }), true);
  assert.equal(isLoosening('blocking', blocking, { ...blocking, safeSearch: false }), true);
  assert.equal(isLoosening('commitment', { mode: 'off' }, { mode: 'delay' }), false);
  assert.equal(isLoosening('commitment', { mode: 'delay' }, { mode: 'off' }), true);
  assert.equal(isLoosening('commitment', { mode: 'pin', pinHash: 'x' }, { mode: 'pin', pinHash: 'y' }), true);
});

check('block list', () => {
  assert.equal(normalizeDomain('https://www.Facebook.com/home?x=1'), 'facebook.com');
  assert.equal(normalizeDomain('m.youtube.com:443'), 'm.youtube.com');
  assert.equal(normalizeDomain('not a domain'), null);
  const blocking = { sites: ['facebook.com'], adult: true };
  assert.equal(getBlockReason('https://m.facebook.com/', blocking), 'site');
  assert.equal(getBlockReason('https://notfacebook.com/', blocking), null);
  assert.equal(getBlockReason('https://www.pornhub.com/view', blocking), 'adult');
  assert.equal(getBlockReason('https://www.pornhub.com/view', { sites: [], adult: false }), null);
  assert.equal(getBlockReason('about:blank', blocking), null);
});

check('safe search', () => {
  assert.equal(enforceSafeSearch('https://www.google.com/search?q=cats'), 'https://www.google.com/search?q=cats&safe=active');
  assert.equal(enforceSafeSearch('https://www.google.com.bd/search?q=x&safe=off#top'), 'https://www.google.com.bd/search?q=x&safe=active#top');
  assert.equal(enforceSafeSearch('https://www.google.com/search?q=x&safe=active'), null);
  assert.equal(enforceSafeSearch('https://www.google.com/maps'), null);
  assert.equal(enforceSafeSearch('https://duckduckgo.com/?q=x'), 'https://duckduckgo.com/?q=x&kp=1');
  assert.equal(enforceSafeSearch('https://duckduckgo.com/about'), null);
  assert.equal(enforceSafeSearch('https://www.bing.com/search?q=x'), 'https://www.bing.com/search?q=x&adlt=strict');
  assert.equal(enforceSafeSearch('https://search.brave.com/search?q=x'), 'https://search.brave.com/search?q=x&safesearch=strict');
  assert.equal(enforceSafeSearch('https://example.com/search?q=x'), null);
  // A URL the search box builds already carries the parameter.
  assert.equal(enforceSafeSearch(formatInputUrl('cats', 'google', true)), null);
});

check('pin', () => {
  const commitment = { mode: 'pin', salt: 'abc', pinHash: hashPin('2468', 'abc') };
  assert.equal(checkPin('2468', commitment), true);
  assert.equal(checkPin('1357', commitment), false);
  assert.equal(checkPin('2468', { mode: 'pin', salt: 'abc', pinHash: null }), false);
});

check('export and import', () => {
  const csv = historyToCsv([
    { timestamp: '2026-10-02T10:00:00Z', title: 'B, "quoted"', url: 'https://b.com/' },
    { timestamp: '2026-10-01T10:00:00Z', title: 'A', url: 'https://a.com/' },
  ]);
  assert.equal(csv, '﻿time,title,url\r\n2026-10-01T10:00:00Z,A,https://a.com/\r\n2026-10-02T10:00:00Z,"B, ""quoted""",https://b.com/\r\n');
  const html = bookmarksToHtml([{ url: 'https://a.com/?x=1&y=2', title: 'A & <B>', timestamp: '2026-10-01T00:00:00Z' }]);
  assert.deepEqual(parseBookmarks(html), [{ url: 'https://a.com/?x=1&y=2', title: 'A & <B>' }], 'round trip');
  const chrome = '<DL><p><DT><H3>Folder</H3><DL><p><DT><A HREF="https://x.org/" ADD_DATE="1" ICON="data:x">X <b>site</b></A>' +
    '<DT><A HREF="javascript:alert(1)">bad</A><DT><A HREF="https://x.org/">dup</A></DL></DL>';
  assert.deepEqual(parseBookmarks(chrome), [{ url: 'https://x.org/', title: 'X site' }]);
  assert.deepEqual(parseBookmarks('[{"url":"https://j.com","title":"J"},{"url":"ftp://no"}]'), [{ url: 'https://j.com', title: 'J' }]);
  assert.deepEqual(parseBookmarks('not a bookmarks file'), []);
});

check('weekly summary', () => {
  const t = (k, v) => translate('en', k, v);
  const today = new Date('2026-10-28T12:00:00Z');
  const days = lastSevenDays(today);
  assert.equal(days.length, 7);
  assert.equal(days[6], '2026-10-28');
  const usage = { '2026-10-28': { 'youtube.com': 3600000, 'news.com': 600000 }, '2026-10-22': { 'a.com': 60000 }, '2026-10-01': { 'old.com': 9e9 } };
  const text = buildWeeklySummary(t, usage, {
    timerEnabled: true, dailyLimitMs: 3600000, strictMode: false, scheduleCount: 2,
    blockedSiteCount: 1, adult: true, safeSearch: false, commitmentMode: 'pin',
  }, today);
  assert.ok(text.includes('Total time: 1h 11m'), text);
  assert.ok(text.includes('1. youtube.com — 1h 0m'), text);
  assert.ok(!text.includes('old.com'), 'outside the week');
  assert.ok(text.includes("Commitment lock: Friend's PIN"), text);
});

if (failures > 0) {
  console.error(`\n${failures} problem(s) found.`);
  process.exit(1);
}
console.log('protection rules OK');
