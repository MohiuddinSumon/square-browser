/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * utils/url.js — turns what the user typed into a URL, and the search engines the user can pick.
 *
 * Pure (no React Native imports) so it can be checked with plain Node.
 */

// `safe` is the query parameter that turns on the engine's strict SafeSearch.
export const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', host: 'www.google.com', path: '/search', query: 'q', safe: ['safe', 'active'] },
  { id: 'duckduckgo', name: 'DuckDuckGo', host: 'duckduckgo.com', path: '/', query: 'q', safe: ['kp', '1'] },
  { id: 'bing', name: 'Bing', host: 'www.bing.com', path: '/search', query: 'q', safe: ['adlt', 'strict'] },
  { id: 'brave', name: 'Brave Search', host: 'search.brave.com', path: '/search', query: 'q', safe: ['safesearch', 'strict'] },
];

export const DEFAULT_SEARCH_ENGINE = 'google';

export const getSearchEngine = (id) =>
  SEARCH_ENGINES.find((e) => e.id === id) || SEARCH_ENGINES[0];

export const isSupportedSearchEngine = (id) => SEARCH_ENGINES.some((e) => e.id === id);

export const buildSearchUrl = (engineId, query, safeSearch = false) => {
  const engine = getSearchEngine(engineId);
  let url = `https://${engine.host}${engine.path}?${engine.query}=${encodeURIComponent(query)}`;
  if (safeSearch) url += `&${engine.safe[0]}=${engine.safe[1]}`;
  return url;
};

/**
 * Address-bar input -> URL: about:blank stays, http(s) URLs stay, things that look like a
 * domain get https://, anything else is searched with the chosen engine.
 */
export const formatInputUrl = (input, engineId, safeSearch = false) => {
  const text = (input || '').trim();
  if (text === '' || text === 'about:blank') return 'about:blank';
  if (text.startsWith('http://') || text.startsWith('https://')) return text;
  if (text.includes('.') && !text.includes(' ')) return 'https://' + text;
  return buildSearchUrl(engineId, text, safeSearch);
};
