/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * HomeScreen - Modern home screen with quick shortcuts and time accountability.
 * Privacy-first: no remote favicon service — domains render as local letter tiles.
 * All colors come from theme.js tokens via getTheme(isDarkMode).
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HomeScreen = () => {
  const { history, bookmarks, navigateTo, addTab, todayStats, yesterdayStats, isDarkMode } = useBrowser();

  const theme = getTheme(isDarkMode);
  const { colors, spacing, borderRadius, typography, shadows, animation, touchTarget } = theme;

  const lifeQuotes = [
    { text: "You are the sum of your time. Don't throw yourself away.", icon: "hourglass-outline" },
    { text: "Yesterday is a part of your life that is gone forever. Look at what you gave it to.", icon: "calendar-outline" },
    { text: "Your life is leaking through your screen. Are these sites worth your soul?", icon: "warning-outline" },
    { text: "Every minute you spend here is a minute you aren't living out there.", icon: "time-outline" },
    { text: "Time is the only currency you can't earn back. You are spending it right now.", icon: "cash-outline" },
    { text: "You are a human being, not a data point. Reclaim your time.", icon: "person-outline" },
    { text: "Each click is a tick of your life's clock. Make it count.", icon: "radio-button-on-outline" },
    { text: "The screen glows, but your life grows dimmer. What are you chasing?", icon: "sunny-outline" },
    { text: "In 100 years, nobody will remember what you scrolled through today.", icon: "hourglass-outline" },
    { text: "Your attention is the most valuable thing you own. Who are you giving it to?", icon: "diamond-outline" },
    { text: "This moment exists once. You're spending it on pixels.", icon: "flower-outline" },
    { text: "The internet promises everything but delivers only distraction.", icon: "cloud-off-outline" },
    { text: "You're not missing out by putting this down. You're missing out on real life.", icon: "leaf-outline" },
    { text: "Hours vanish here, while your dreams gather dust.", icon: "moon-outline" },
    { text: "Perfect moments are slipping away while you watch perfect videos.", icon: "water-outline" },
    { text: "The world outside waits for no one, especially not those who wait for likes.", icon: "people-outline" },
    { text: "Your childhood is gone. Your adulthood is disappearing. How much of it have you spent here?", icon: "hourglass-outline" },
    { text: "This isn't living. It's numbing. Feel something real instead.", icon: "heart-outline" },
    { text: "Notifications are not priorities. They are someone else's agenda for your time.", icon: "notifications-off-outline" },
    { text: "You can't save time for later. It's being spent right now.", icon: "timer-outline" },
    { text: "The algorithm knows you better than you know yourself. That should scare you.", icon: "eye-off-outline" },
    { text: "Everything you seek here - connection, meaning, purpose - exists out there, not in here.", icon: "git-branch-outline" },
    { text: "Your heroes didn't build their legacy by watching others build theirs.", icon: "trophy-outline" },
    { text: "This screen is a thief, stealing moments you can never get back.", icon: "hand-left-outline" },
    { text: "At the end, nobody's last words will be 'I wish I had scrolled more.'", icon: "ribbon-outline" },
    { text: "The past is gone, the future isn't guaranteed. All you have is now - and you're giving it away.", icon: "flash-outline" },
    { text: "Your dreams don't have a notification bell. They wait in silence while you chase noise.", icon: "notifications-outline" },
    { text: "Somewhere, someone is living the life you want. They're not on this screen.", icon: "compass-outline" },
    { text: "You think you're passing time. Time is passing you.", icon: "swap-horizontal-outline" },
    { text: "Regret is heavy. Choose carefully how you fill your hours.", icon: "barbell-outline" },
  ];

  // Recent bookmarks for quick access
  const quickBookmarks = useMemo(() => {
    return [...bookmarks].reverse().slice(0, 4);
  }, [bookmarks]);

  const randomQuote = useMemo(() => {
    return lifeQuotes[Math.floor(Math.random() * lifeQuotes.length)];
  }, []);

  // Quote cycling state
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * lifeQuotes.length));
  const currentQuote = lifeQuotes[quoteIndex];

  const cycleQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % lifeQuotes.length);
  };

  const formatDuration = (ms) => {
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  const totalToday = useMemo(() => Object.values(todayStats).reduce((a, b) => a + b, 0), [todayStats]);

  // Dedup by hostname/origin, keep the most recent title, cap at 6.
  const mostVisited = useMemo(() => {
    const uniqueSites = {};
    history.forEach(item => {
      let host;
      try {
        host = new URL(item.url).hostname;
      } catch (e) {
        host = item.url;
      }
      if (!uniqueSites[host] || uniqueSites[host].visitCount < item.visitCount) {
        uniqueSites[host] = { ...item, host };
      }
    });

    return Object.values(uniqueSites)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 6);
  }, [history]);

  // Entrance animation (opacity + translateY only, native driver, <300ms).
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: animation.normal,
      useNativeDriver: true,
    }).start();
  }, [entrance, animation.normal]);

  // Pull-to-refresh state.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    // Lightweight refresh: brief spinner, no network.
    setTimeout(() => setRefreshing(false), 400);
  };

  // Local, deterministic letter tile from the domain (no network).
  const domainLetter = (url) => {
    try {
      const host = new URL(url).hostname;
      return host.charAt(0).toUpperCase();
    } catch (e) {
      return '?';
    }
  };

  const handleSitePress = (url) => {
    navigateTo(url);
  };

  const handleSiteLongPress = (url) => {
    Alert.alert(
      'Site Options',
      url,
      [
        { text: 'Open in Current Tab', onPress: () => navigateTo(url) },
        { text: 'Open in New Tab', onPress: () => addTab(url) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const LetterTile = ({ url, size = 48, radius = 14 }) => (
    <View
      style={[
        styles.letterTile,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.accentSoft,
        },
      ]}
    >
      <Text style={[styles.letterTileText, { color: colors.accent }]}>{domainLetter(url)}</Text>
    </View>
  );

  const BookmarkItem = ({ bookmark }) => (
    <Pressable
      style={({ pressed }) => [
        styles.shortcutItem,
        {
          backgroundColor: colors.surface,
          minHeight: touchTarget.min,
        },
        pressed && { opacity: animation.pressOpacity },
      ]}
      onPress={() => navigateTo(bookmark.url)}
    >
      <LetterTile url={bookmark.url} />
      <Text style={[styles.shortcutName, { color: colors.text }]} numberOfLines={1}>
        {bookmark.title || new URL(bookmark.url).hostname}
      </Text>
    </Pressable>
  );

  const SiteItem = ({ site }) => (
    <Pressable
      style={({ pressed }) => [
        styles.siteItem,
        {
          backgroundColor: colors.surface,
          minHeight: touchTarget.minRow,
        },
        pressed && { opacity: animation.pressOpacity },
      ]}
      onPress={() => handleSitePress(site.url)}
      onLongPress={() => handleSiteLongPress(site.url)}
    >
      <LetterTile url={site.url} size={36} radius={10} />
      <View style={styles.siteInfo}>
        <Text style={[styles.siteTitle, { color: colors.text }]} numberOfLines={1}>
          {site.title || site.host}
        </Text>
        <Text style={[styles.siteUrl, { color: colors.textSecondary }]} numberOfLines={1}>
          {site.host}
        </Text>
      </View>
      <View style={[styles.visitCount, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.visitCountText, { color: colors.textSecondary }]}>{site.visitCount}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <Animated.View
          style={{
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          {/* Quick Stats Header */}
          <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{formatDuration(totalToday)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{history.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Visits</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{bookmarks.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bookmarks</Text>
              </View>
            </View>
          </View>

          {/* Accountability Quote - Core Feature (hidden until user has data) */}
          {totalToday > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.quoteCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.separator,
                },
                pressed && { opacity: animation.pressOpacity },
              ]}
              onPress={cycleQuote}
            >
              <View style={styles.quoteContainer}>
                <Ionicons name={currentQuote.icon} size={20} color={colors.warning} />
                <Text style={[styles.quoteText, { color: colors.text }]}>
                  "{currentQuote.text}"
                </Text>
                <Ionicons name="refresh" size={16} color={colors.textTertiary} style={styles.shuffleIcon} />
              </View>
              <View style={[styles.quoteStats, { borderTopColor: colors.separator }]}>
                <Text style={[styles.quoteStatsText, { color: colors.textSecondary }]}>
                  You've spent {formatDuration(totalToday)} browsing today. Make it count.
                </Text>
              </View>
            </Pressable>
          )}

          {/* Quick Access - Recent Bookmarks */}
          {quickBookmarks.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
              <View style={styles.shortcutsGrid}>
                {quickBookmarks.map((bookmark) => (
                  <BookmarkItem key={bookmark.id} bookmark={bookmark} />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Bookmark some pages to see them here for quick access.
              </Text>
            </View>
          )}

          {/* Most Visited */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Most Visited</Text>
            {mostVisited.length > 0 ? (
              mostVisited.map((site) => (
                <SiteItem key={site.id || site.host} site={site} />
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Sites you visit most will appear here
              </Text>
            )}
          </View>
        </Animated.View>
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
  shuffleIcon: {
    marginTop: 4,
  },
  quoteStats: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
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
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
  letterTile: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  letterTileText: {
    fontSize: 22,
    fontWeight: '600',
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