/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * HomeScreen - Modern home screen with quick shortcuts and time accountability
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Platform, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HomeScreen = () => {
  const { history, bookmarks, navigateTo, addTab, todayStats, yesterdayStats, isDarkMode } = useBrowser();

  const lifeQuotes = [
    { text: "You are the sum of your time. Don't throw yourself away.", icon: "hourglass-outline", color: "#FF9800" },
    { text: "Yesterday is a part of your life that is gone forever. Look at what you gave it to.", icon: "calendar-outline", color: "#9E9E9E" },
    { text: "Your life is leaking through your screen. Are these sites worth your soul?", icon: "warning-outline", color: "#F44336" },
    { text: "Every minute you spend here is a minute you aren't living out there.", icon: "time-outline", color: "#FF9800" },
    { text: "Time is the only currency you can't earn back. You are spending it right now.", icon: "cash-outline", color: "#4CAF50" },
    { text: "You are a human being, not a data point. Reclaim your time.", icon: "person-outline", color: "#2196F3" },
    { text: "Each click is a tick of your life's clock. Make it count.", icon: "radio-button-on-outline", color: "#FF9800" },
    { text: "The screen glows, but your life grows dimmer. What are you chasing?", icon: "sunny-outline", color: "#FFC107" },
    { text: "In 100 years, nobody will remember what you scrolled through today.", icon: "hourglass-outline", color: "#9E9E9E" },
    { text: "Your attention is the most valuable thing you own. Who are you giving it to?", icon: "diamond-outline", color: "#9C27B0" },
    { text: "This moment exists once. You're spending it on pixels.", icon: "flower-outline", color: "#E91E63" },
    { text: "The internet promises everything but delivers only distraction.", icon: "cloud-off-outline", color: "#9E9E9E" },
    { text: "You're not missing out by putting this down. You're missing out on real life.", icon: "leaf-outline", color: "#4CAF50" },
    { text: "Hours vanish here, while your dreams gather dust.", icon: "moon-outline", color: "#3F51B5" },
    { text: "Perfect moments are slipping away while you watch perfect videos.", icon: "water-outline", color: "#00BCD4" },
    { text: "The world outside waits for no one, especially not those who wait for likes.", icon: "people-outline", color: "#795548" },
    { text: "Your childhood is gone. Your adulthood is disappearing. How much of it have you spent here?", icon: "hourglass-outline", color: "#FF5722" },
    { text: "This isn't living. It's numbing. Feel something real instead.", icon: "heart-outline", color: "#E91E63" },
    { text: "Notifications are not priorities. They are someone else's agenda for your time.", icon: "notifications-off-outline", color: "#607D8B" },
    { text: "You can't save time for later. It's being spent right now.", icon: "timer-outline", color: "#FF9800" },
    { text: "The algorithm knows you better than you know yourself. That should scare you.", icon: "eye-off-outline", color: "#F44336" },
    { text: "Everything you seek here - connection, meaning, purpose - exists out there, not in here.", icon: "git-branch-outline", color: "#4CAF50" },
    { text: "Your heroes didn't build their legacy by watching others build theirs.", icon: "trophy-outline", color: "#FFC107" },
    { text: "This screen is a thief, stealing moments you can never get back.", icon: "hand-left-outline", color: "#F44336" },
    { text: "At the end, nobody's last words will be 'I wish I had scrolled more.'", icon: "ribbon-outline", color: "#9E9E9E" },
    { text: "The past is gone, the future isn't guaranteed. All you have is now - and you're giving it away.", icon: "flash-outline", color: "#FFC107" },
    { text: "Your dreams don't have a notification bell. They wait in silence while you chase noise.", icon: "notifications-outline", color: "#9E9E9E" },
    { text: "Somewhere, someone is living the life you want. They're not on this screen.", icon: "compass-outline", color: "#00BCD4" },
    { text: "You think you're passing time. Time is passing you.", icon: "swap-horizontal-outline", color: "#FF9800" },
    { text: "Regret is heavy. Choose carefully how you fill your hours.", icon: "barbell-outline", color: "#607D8B" }
  ];

  // Recent bookmarks for quick access
  const quickBookmarks = useMemo(() => {
    return [...bookmarks].reverse().slice(0, 4);
  }, [bookmarks]);

  // Colors based on theme
  const colors = {
    bg: isDarkMode ? '#0A0A0A' : '#F5F7FA',
    card: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    text: isDarkMode ? '#E0E0E0' : '#1A1A1A',
    subtext: isDarkMode ? '#888' : '#666',
    border: isDarkMode ? '#2A2A2A' : '#E0E0E0',
    accent: '#2196F3',
    accentGradient: ['#2196F3', '#1976D2'],
    danger: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
  };

  const randomQuote = useMemo(() => {
    return lifeQuotes[Math.floor(Math.random() * lifeQuotes.length)];
  }, []);

  const formatDuration = (ms) => {
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

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
      'Site Options',
      url,
      [
        { text: 'Open in Current Tab', onPress: () => navigateTo(url) },
        { text: 'Open in New Tab', onPress: () => addTab(url) },
        { text: 'Cancel', style: 'cancel' }
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
      <View style={[styles.visitCount, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }]}>
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
        <View style={[styles.statsHeader, { backgroundColor: isDarkMode ? '#1A1A1A' : '#fff' }]}>
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{formatDuration(totalToday)}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Today</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{history.length}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Visits</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{bookmarks.length}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Bookmarks</Text>
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
                You've spent {formatDuration(totalToday)} browsing today. Make it count.
              </Text>
            </View>
          )}
        </View>

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
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              Bookmark some pages to see them here for quick access.
            </Text>
          </View>
        )}

        {/* Most Visited */}
        {mostVisited.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Most Visited</Text>
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
