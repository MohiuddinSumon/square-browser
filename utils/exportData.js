/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * utils/exportData.js — files and text built from local data: history export (CSV / HTML),
 * bookmark export and import (the Netscape HTML format every browser reads and writes), and
 * the weekly summary sent to an accountability partner. Pure, so it can be checked with Node.
 */
import { formatDuration } from '../i18n/index.js';

const csvCell = (value) => {
  const text = String(value == null ? '' : value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const escapeHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** History as CSV (time, title, url), oldest first, with a BOM so Excel reads UTF-8. */
export const historyToCsv = (history) => {
  const rows = [...history]
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
    .map((h) => [h.timestamp, h.title, h.url].map(csvCell).join(','));
  return '﻿' + ['time,title,url', ...rows].join('\r\n') + '\r\n';
};

/** History as a self-contained HTML page, newest first. */
export const historyToHtml = (history, title) => {
  const rows = [...history]
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .map((h) =>
      `<tr><td>${escapeHtml(String(h.timestamp).replace('T', ' ').slice(0, 19))}</td>` +
      `<td><a href="${escapeHtml(h.url)}">${escapeHtml(h.title || h.url)}</a></td></tr>`)
    .join('\n');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{font-family:sans-serif;margin:16px}table{border-collapse:collapse;width:100%}
td{border-bottom:1px solid #ddd;padding:6px;vertical-align:top;word-break:break-all}td:first-child{white-space:nowrap;color:#666}</style>
</head><body><h1>${escapeHtml(title)}</h1>
<table>
${rows}
</table></body></html>
`;
};

/** Bookmarks in the Netscape bookmark file format (imports into Chrome, Firefox, ...). */
export const bookmarksToHtml = (bookmarks) => {
  const items = bookmarks.map((b) => {
    const added = Math.floor(new Date(b.timestamp || Date.now()).getTime() / 1000) || 0;
    return `    <DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${added}">${escapeHtml(b.title || b.url)}</A>`;
  });
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${items.join('\n')}
</DL><p>
`;
};

const unescapeHtml = (text) =>
  String(text)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * Reads bookmarks from a Netscape HTML export (any browser) or a JSON list of
 * { url, title }. Returns [{ url, title }] with http(s) links only, without duplicates.
 */
export const parseBookmarks = (text) => {
  const found = [];
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed).forEach((b) => b && found.push({ url: b.url, title: b.title || b.name }));
    } catch (e) {}
  } else {
    const anchor = /<a\s[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchor.exec(trimmed))) {
      found.push({ url: unescapeHtml(match[1]), title: unescapeHtml(match[2].replace(/<[^>]*>/g, '').trim()) });
    }
  }
  const seen = new Set();
  return found.filter((b) => {
    if (!b.url || !/^https?:\/\//i.test(b.url) || seen.has(b.url)) return false;
    seen.add(b.url);
    return true;
  }).map((b) => ({ url: b.url, title: b.title || b.url }));
};

/** The 7 usage-date keys ending at `today` (same YYYY-MM-DD keys BrowserContext writes). */
export const lastSevenDays = (today = new Date()) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

/**
 * Plain-text weekly report for an accountability partner, built from local usage stats.
 * usage: { 'YYYY-MM-DD': { domain: ms } }. settings: { timerEnabled, dailyLimitMs,
 * strictMode, scheduleCount, blockedSiteCount, adult, safeSearch, commitmentMode }.
 */
export const buildWeeklySummary = (t, usage, settings, today = new Date()) => {
  const days = lastSevenDays(today);
  const perSite = {};
  let total = 0;
  days.forEach((day) => {
    Object.entries(usage[day] || {}).forEach(([domain, ms]) => {
      perSite[domain] = (perSite[domain] || 0) + ms;
      total += ms;
    });
  });
  const top = Object.entries(perSite).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const yes = t('summary.on');
  const no = t('summary.off');

  const lines = [
    t('summary.heading', { from: days[0], to: days[6] }),
    '',
    t('summary.total', { time: formatDuration(t, total) }),
    t('summary.average', { time: formatDuration(t, total / 7) }),
    '',
    t('summary.topSites'),
    ...(top.length
      ? top.map(([domain, ms], i) => `${i + 1}. ${domain} — ${formatDuration(t, ms)}`)
      : [t('summary.noBrowsing')]),
    '',
    t('summary.settings'),
    `• ${t('summary.dailyLimit')}: ${settings.timerEnabled ? formatDuration(t, settings.dailyLimitMs) : no}`,
    `• ${t('summary.strictMode')}: ${settings.timerEnabled && settings.strictMode ? yes : no}`,
    `• ${t('summary.schedules')}: ${settings.scheduleCount}`,
    `• ${t('summary.blockedSites')}: ${settings.blockedSiteCount}`,
    `• ${t('summary.adultFilter')}: ${settings.adult ? yes : no}`,
    `• ${t('summary.safeSearch')}: ${settings.safeSearch ? yes : no}`,
    `• ${t('summary.commitment')}: ${t('commitment.mode_' + settings.commitmentMode)}`,
    '',
    t('summary.footer'),
  ];
  return lines.join('\n');
};
