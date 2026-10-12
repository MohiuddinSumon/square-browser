/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * HomeScreen - Modern home screen with quick shortcuts and time accountability
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Platform, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';
import { formatDuration as formatDurationWith } from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Icon + colour for each quote, in the same order as the "home.quotes" list in i18n/*.js
const QUOTE_STYLES = [
  { icon: 'hourglass-outline', color: '#FF9800' },
  { icon: 'calendar-outline', color: '#9E9E9E' },
  { icon: 'warning-outline', color: '#F44336' },
  { icon: 'time-outline', color: '#FF9800' },
  { icon: 'cash-outline', color: '#4CAF50' },
  { icon: 'person-outline', color: '#2196F3' },
  { icon: 'radio-button-on-outline', color: '#FF9800' },
  { icon: 'sunny-outline', color: '#FFC107' },
  { icon: 'hourglass-outline', color: '#9E9E9E' },
  { icon: 'diamond-outline', color: '#9C27B0' },
  { icon: 'flower-outline', color: '#E91E63' },
  { icon: 'cloud-off-outline', color: '#9E9E9E' },
  { icon: 'leaf-outline', color: '#4CAF50' },
  { icon: 'moon-outline', color: '#3F51B5' },
  { icon: 'water-outline', color: '#00BCD4' },
  { icon: 'people-outline', color: '#795548' },
  { icon: 'hourglass-outline', color: '#FF5722' },
  { icon: 'heart-outline', color: '#E91E63' },
  { icon: 'notifications-off-outline', color: '#607D8B' },
  { icon: 'timer-outline', color: '#FF9800' },
  { icon: 'eye-off-outline', color: '#F44336' },
  { icon: 'git-branch-outline', color: '#4CAF50' },
  { icon: 'trophy-outline', color: '#FFC107' },
  { icon: 'hand-left-outline', color: '#F44336' },
  { icon: 'ribbon-outline', color: '#9E9E9E' },
  { icon: 'flash-outline', color: '#FFC107' },
  { icon: 'notifications-outline', color: '#9E9E9E' },
  { icon: 'compass-outline', color: '#00BCD4' },
  { icon: 'swap-horizontal-outline', color: '#FF9800' },
  { icon: 'barbell-outline', color: '#607D8B' },
];

const HomeScreen = () => {
  const { history, bookmarks, navigateTo, addTab, todayStats, yesterdayStats, isDarkMode, t } = useBrowser();

  // Recent bookmarks for quick access
  const quickBookmarks = useMemo(() => {
    return [...bookmarks].reverse().slice(0, 4);
  }, [bookmarks]);

  // Colors based on theme
  const theme = getTheme(isDarkMode);
  const colors = {
    bg: theme.colors.groupedBackground,
    card: theme.colors.surface,
    text: theme.colors.text,
    subtext: theme.colors.textSecondary,
    border: theme.colors.separator,
    accent: theme.colors.accent,
    accentGradient: [theme.colors.accent, '#0062CC'],
    danger: theme.colors.danger,
    success: theme.colors.success,
    warning: theme.colors.warning,
  };

  // Pick the quote once per visit; the text follows the current language.
  const quoteIndex = useMemo(() => Math.floor(Math.random() * QUOTE_STYLES.length), []);
  const randomQuote = { ...QUOTE_STYLES[quoteIndex], text: t('home.quotes')[quoteIndex] };

  const formatDuration = (ms) => formatDurationWith(t, ms);

  const totalToday = useMemo(() => Object.values(todayStats).reduce((a, b) => a + b, 0), [todayStats]);

  const mostVisited = useMemo(() => {
    const uniqueSites = {};
    history.forEach(item => {
      if (!uniqueSites[item.url] || uniqueSites[item.url].visitCount < item.visitCount) {
        uniqueSites[item.url] = item;
      }
    });

    return Object.values(uniqueSites)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 6);
  }, [history]);

  const getFavicon = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    } catch (e) {
      return null;
    }
  };

  const handleSitePress = (url) => {
    navigateTo(url);
  };

  const handleSiteLongPress = (url) => {
    Alert.alert(
      t('home.siteOptions'),
      url,
      [
        { text: t('home.openCurrentTab'), onPress: () => navigateTo(url) },
        { text: t('home.openNewTab'), onPress: () => addTab(url) },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  const BookmarkItem = ({ bookmark }) => (
    <TouchableOpacity
      style={[styles.shortcutItem, { backgroundColor: colors.card }]}
      onPress={() => navigateTo(bookmark.url)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getFavicon(bookmark.url) }}
        style={styles.shortcutFavicon}
        defaultSource={require('../assets/icon.png')}
      />
      <Text style={[styles.shortcutName, { color: colors.text }]} numberOfLines={1}>
        {bookmark.title || new URL(bookmark.url).hostname}
      </Text>
    </TouchableOpacity>
  );

  const SiteItem = ({ site }) => (
    <TouchableOpacity
      style={[styles.siteItem, { backgroundColor: colors.card }]}
      onPress={() => handleSitePress(site.url)}
      onLongPress={() => handleSiteLongPress(site.url)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getFavicon(site.url) }}
        style={styles.siteFavicon}
        defaultSource={require('../assets/icon.png')}
      />
      <View style={styles.siteInfo}>
        <Text style={[styles.siteTitle, { color: colors.text }]} numberOfLines={1}>
          {site.title || new URL(site.url).hostname}
        </Text>
        <Text style={[styles.siteUrl, { color: colors.subtext }]} numberOfLines={1}>
          {new URL(site.url).hostname}
        </Text>
      </View>
      <View style={[styles.visitCount, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={[styles.visitCountText, { color: colors.subtext }]}>{site.visitCount}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats Header */}
        <View style={[styles.statsHeader, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{formatDuration(totalToday)}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>{t('home.today')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{history.length}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>{t('home.visits')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{bookmarks.length}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>{t('home.bookmarks')}</Text>
            </View>
          </View>
        </View>

        {/* Accountability Quote - Core Feature */}
        <View style={[styles.quoteCard, { backgroundColor: isDarkMode ? '#1F1A1A' : '#FFF8F0', borderColor: isDarkMode ? '#3A2A1A' : '#FFE0B2' }]}>
          <View style={styles.quoteContainer}>
            <Ionicons name={randomQuote.icon} size={20} color={randomQuote.color} />
            <Text style={[styles.quoteText, { color: colors.text }]}>
              "{randomQuote.text}"
            </Text>
          </View>
          {totalToday > 0 && (
            <View style={styles.quoteStats}>
              <Text style={[styles.quoteStatsText, { color: colors.subtext }]}>
                {t('home.spentToday', { time: formatDuration(totalToday) })}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Access - Recent Bookmarks */}
        {quickBookmarks.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.quickAccess')}</Text>
            <View style={styles.shortcutsGrid}>
              {quickBookmarks.map((bookmark) => (
                <BookmarkItem key={bookmark.id} bookmark={bookmark} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.quickAccess')}</Text>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t('home.quickAccessEmpty')}
            </Text>
          </View>
        )}

        {/* Most Visited */}
        {mostVisited.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.mostVisited')}</Text>
            {mostVisited.map((site) => (
              <SiteItem key={site.id} site={site} />
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statsHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  quoteCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  quoteText: {
    fontSize: 17,
    fontStyle: 'italic',
    lineHeight: 26,
    flex: 1,
    fontWeight: '400',
  },
  quoteStats: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  quoteStatsText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  shortcutItem: {
    width: (SCREEN_WIDTH - 72) / 4,
    marginHorizontal: 6,
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
  shortcutFavicon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginBottom: 8,
  },
  shortcutName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  siteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  siteFavicon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 12,
  },
  siteInfo: {
    flex: 1,
  },
  siteTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  siteUrl: {
    fontSize: 12,
  },
  visitCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  visitCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default HomeScreen;
