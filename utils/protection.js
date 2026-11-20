/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * utils/protection.js — rules for the accountability features: schedules, the block list,
 * SafeSearch and the commitment lock. Pure (no React Native imports) so it can be checked
 * with plain Node (scripts/check-protection.js).
 *
 * "Protection settings" are the ones that limit browsing: the daily timer, schedules, the
 * block list and the commitment lock itself. When the commitment lock is on, a change that
 * makes any of them weaker (isLoosening) waits 24 hours or needs the partner's PIN; a change
 * that makes them stricter always applies at once.
 */
import { ADULT_DOMAINS } from './adultDomains.js';
import { sha256 } from './sha256.js';

export const COMMITMENT_DELAY_MS = 24 * 60 * 60 * 1000;
export const MAX_SCHEDULES = 6;
// Schedules may never lock the browser for good: every day keeps at least 4 open hours,
// and no stretch of back-to-back blocked time is longer than 20 hours.
export const MIN_OPEN_MINUTES_PER_DAY = 4 * 60;
export const MAX_BLOCKED_MINUTES_IN_A_ROW = 20 * 60;

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

// ---------------------------------------------------------------------------------------
// Schedules: { id, enabled, start, end, days }
//   start/end are minutes after midnight (local time); end < start runs past midnight.
//   days lists the weekdays the window starts on (0 = Sunday ... 6 = Saturday).
// ---------------------------------------------------------------------------------------

/** One flag per minute of the week (Sunday 00:00 first) for the enabled schedules. */
export const scheduleCoverage = (schedules = []) => {
  const covered = new Uint8Array(MINUTES_PER_WEEK);
  schedules.forEach((s) => {
    if (!s || !s.enabled || s.start === s.end) return;
    (s.days || []).forEach((day) => {
      const from = day * MINUTES_PER_DAY + s.start;
      const length = s.end > s.start ? s.end - s.start : MINUTES_PER_DAY - s.start + s.end;
      for (let i = 0; i < length; i++) covered[(from + i) % MINUTES_PER_WEEK] = 1;
    });
  });
  return covered;
};

const weekMinute = (date) => date.getDay() * MINUTES_PER_DAY + date.getHours() * 60 + date.getMinutes();

/**
 * When a schedule blocks browsing at `date`, returns the Date it opens again (following
 * back-to-back windows); otherwise null.
 */
export const scheduleBlockUntil = (schedules, date = new Date()) => {
  const covered = scheduleCoverage(schedules);
  const now = weekMinute(date);
  if (!covered[now]) return null;
  let steps = 0;
  while (steps < MINUTES_PER_WEEK && covered[(now + steps) % MINUTES_PER_WEEK]) steps++;
  const until = new Date(date.getTime());
  until.setSeconds(0, 0);
  return new Date(until.getTime() + steps * 60000);
};

/** Returns an i18n error key for an invalid schedule list, or null when it is fine. */
export const validateSchedules = (schedules) => {
  if (schedules.length > MAX_SCHEDULES) return 'schedules.errorTooMany';
  for (const s of schedules) {
    if (s.start === s.end) return 'schedules.errorSameTime';
    if (!s.days || s.days.length === 0) return 'schedules.errorNoDays';
  }
  const covered = scheduleCoverage(schedules);
  for (let day = 0; day < 7; day++) {
    let blocked = 0;
    for (let m = 0; m < MINUTES_PER_DAY; m++) blocked += covered[day * MINUTES_PER_DAY + m];
    if (MINUTES_PER_DAY - blocked < MIN_OPEN_MINUTES_PER_DAY) return 'schedules.errorTooLong';
  }
  // Longest blocked run, wrapping from Saturday night into Sunday.
  let run = 0;
  for (let i = 0; i < 2 * MINUTES_PER_WEEK; i++) {
    run = covered[i % MINUTES_PER_WEEK] ? run + 1 : 0;
    if (run > MAX_BLOCKED_MINUTES_IN_A_ROW) return 'schedules.errorTooLong';
  }
  return null;
};

/** "HH:MM" for minutes after midnight. */
export const formatMinutes = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// ---------------------------------------------------------------------------------------
// Block list and SafeSearch: { sites: [domain], adult: bool, safeSearch: bool }
// ---------------------------------------------------------------------------------------

export const DEFAULT_BLOCKING = { sites: [], adult: false, safeSearch: false };

/** "https://www.Example.com/page" -> "example.com"; null when it is not a domain. */
export const normalizeDomain = (input) => {
  let text = String(input || '').trim().toLowerCase();
  text = text.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '');
  text = text.replace(/^www\./, '').replace(/\.$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(text) ? text : null;
};

const hostOf = (url) => {
  const match = String(url || '').match(/^https?:\/\/([^/?#:]+)/i);
  return match ? match[1].toLowerCase() : null;
};

export const hostMatches = (host, domains) =>
  !!host && domains.some((d) => host === d || host.endsWith('.' + d));

/** 'site' (user's list), 'adult' (adult filter) or null when the URL may load. */
export const getBlockReason = (url, blocking) => {
  if (!blocking) return null;
  const host = hostOf(url);
  if (!host) return null;
  if (hostMatches(host, blocking.sites || [])) return 'site';
  if (blocking.adult && hostMatches(host, ADULT_DOMAINS)) return 'adult';
  return null;
};

// Search pages and the parameter that forces strict SafeSearch on each.
const SAFE_SEARCH_RULES = [
  { test: (h, p) => /(^|\.)google\.[a-z.]+$/.test(h) && (p === '/search' || p === '/images'), key: 'safe', value: 'active' },
  { test: (h, p) => /(^|\.)bing\.com$/.test(h) && (p.startsWith('/search') || p.startsWith('/images')), key: 'adlt', value: 'strict' },
  { test: (h) => /(^|\.)duckduckgo\.com$/.test(h), key: 'kp', value: '1', needsQuery: true },
  { test: (h, p) => h === 'search.brave.com' && p.startsWith('/'), key: 'safesearch', value: 'strict', needsQuery: true },
  { test: (h, p) => /(^|\.)search\.yahoo\.com$/.test(h) && p.startsWith('/search'), key: 'vm', value: 'r' },
];

/**
 * Returns the URL with strict SafeSearch forced when it is a search-results page that does
 * not already have it; otherwise null (load the URL as it is).
 */
export const enforceSafeSearch = (url) => {
  const match = String(url || '').match(/^(https?:\/\/)([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i);
  if (!match) return null;
  const [, scheme, hostPort, rawPath, rawQuery = '', hash = ''] = match;
  const host = hostPort.toLowerCase().replace(/:\d+$/, '');
  const path = rawPath || '/';
  const rule = SAFE_SEARCH_RULES.find((r) => r.test(host, path));
  if (!rule) return null;
  const params = rawQuery.replace(/^\?/, '').split('&').filter(Boolean);
  if (rule.needsQuery && !params.some((p) => p.startsWith('q='))) return null;
  const wanted = `${rule.key}=${rule.value}`;
  if (params.includes(wanted)) return null;
  const kept = params.filter((p) => p.split('=')[0] !== rule.key);
  kept.push(wanted);
  return `${scheme}${hostPort}${path}?${kept.join('&')}${hash}`;
};

// ---------------------------------------------------------------------------------------
// Commitment lock: { mode: 'off' | 'delay' | 'pin', pinHash, salt }
//   delay: weakening changes apply 24h after they are asked for
//   pin:   weakening changes need the PIN (held by a friend); without it they wait 24h
// ---------------------------------------------------------------------------------------

export const DEFAULT_COMMITMENT = { mode: 'off', pinHash: null, salt: null };

export const makeSalt = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const hashPin = (pin, salt) => sha256(`${salt}:${pin}`);

export const isValidPin = (pin) => /^\d{4,8}$/.test(String(pin || ''));

export const checkPin = (pin, commitment) =>
  !!commitment && !!commitment.pinHash && hashPin(pin, commitment.salt) === commitment.pinHash;

/**
 * True when going from `current` to `next` makes a protection setting weaker.
 * type: 'timer' | 'schedules' | 'blocking' | 'commitment'
 */
export const isLoosening = (type, current, next) => {
  switch (type) {
    case 'timer':
      if (current.enabled && !next.enabled) return true;
      if (!next.enabled) return false;
      if (!current.enabled) return false;
      return next.dailyLimitMs > current.dailyLimitMs || (current.strictMode && !next.strictMode);
    case 'schedules': {
      const before = scheduleCoverage(current);
      const after = scheduleCoverage(next);
      for (let i = 0; i < MINUTES_PER_WEEK; i++) if (before[i] && !after[i]) return true;
      return false;
    }
    case 'blocking':
      return (current.sites || []).some((d) => !(next.sites || []).includes(d)) ||
        (current.adult && !next.adult) ||
        (current.safeSearch && !next.safeSearch);
    case 'commitment':
      return current.mode !== 'off' &&
        (next.mode !== current.mode || next.pinHash !== current.pinHash);
    default:
      return false;
  }
};
