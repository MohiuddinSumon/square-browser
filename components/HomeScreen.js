import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const HomeScreen = () => {
  const { history, bookmarks, navigateTo, addTab, todayStats, yesterdayStats } = useBrowser();

  const lifeQuotes = [
    "You are the sum of your time. Don't throw yourself away.",
    "Yesterday is a part of your life that is gone forever. Look at what you gave it to.",
    "Your life is leaking through your screen. Are these sites worth your soul?",
    "Every minute you spend here is a minute you aren't living out there.",
    "Time is the only currency you can't earn back. You are spending it right now.",
    "You are a human being, not a data point. Reclaim your time."
  ];

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
  const totalYesterday = useMemo(() => Object.values(yesterdayStats).reduce((a, b) => a + b, 0), [yesterdayStats]);

  const topSinks = useMemo(() => {
    return Object.entries(todayStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [todayStats]);

  // Existing mostVisited and bookmarks logic...
  const mostVisited = useMemo(() => {
    const uniqueSites = {};
    history.forEach(item => {
      if (!uniqueSites[item.url] || uniqueSites[item.url].visitCount < item.visitCount) {
        uniqueSites[item.url] = item;
      }
    });

    return Object.values(uniqueSites)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 8);
  }, [history]);

  const recentBookmarks = useMemo(() => {
    return [...bookmarks].reverse().slice(0, 8);
  }, [bookmarks]);

  const getFavicon = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    } catch (e) {
      return null;
    }
  };

  const renderSiteIcon = (url, title) => {
    const favicon = getFavicon(url);
    const initial = title ? title.charAt(0).toUpperCase() : '?';

    return (
      <View style={styles.iconContainer}>
        {favicon ? (
          <Image source={{ uri: favicon }} style={styles.favicon} />
        ) : (
          <View style={[styles.fallbackIcon, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.fallbackText}>{initial}</Text>
          </View>
        )}
      </View>
    );
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

  const SiteItem = ({ url, title }) => (
    <TouchableOpacity 
      style={styles.siteItem} 
      onPress={() => handleSitePress(url)}
      onLongPress={() => handleSiteLongPress(url)}
    >
      {renderSiteIcon(url, title)}
      <Text style={styles.siteTitle} numberOfLines={1}>{title || url}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.lifeHeader}>
        <Text style={styles.quoteText}>"{randomQuote}"</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Life Spent Today</Text>
            <Text style={styles.statValue}>{formatDuration(totalToday)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Life Spent Yesterday</Text>
            <Text style={[styles.statValue, { color: '#666' }]}>{formatDuration(totalYesterday)}</Text>
          </View>
        </View>

        {totalToday > 0 && (
          <View style={styles.usageComparison}>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: '100%', backgroundColor: '#eee' }]}>
                <View style={[styles.barActive, { 
                  width: `${Math.min(100, (totalToday / (totalYesterday || totalToday)) * 100)}%`,
                  backgroundColor: totalToday > totalYesterday && totalYesterday > 0 ? '#F44336' : '#4CAF50'
                }]} />
              </View>
            </View>
            <Text style={styles.comparisonText}>
              {totalYesterday > 0 
                ? (totalToday > totalYesterday 
                  ? `You are consuming life ${Math.round((totalToday/totalYesterday - 1) * 100)}% faster than yesterday.`
                  : `You are reclaiming your life today. Well done.`)
                : "Your life journey continues through these pages."}
            </Text>
          </View>
        )}
      </View>

      {topSinks.length > 0 && (
        <View style={styles.sinkSection}>
          <Text style={styles.sinkTitle}>Where your life went today:</Text>
          {topSinks.map(([domain, duration]) => (
            <View key={domain} style={styles.sinkItem}>
              <Text style={styles.sinkDomain}>{domain}</Text>
              <Text style={styles.sinkDuration}>{formatDuration(duration)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color="#333" />
          <Text style={styles.sectionTitle}>Most Visited</Text>
        </View>
        <View style={styles.grid}>
          {mostVisited.length > 0 ? (
            mostVisited.map((site) => (
              <SiteItem key={site.id} url={site.url} title={site.title} />
            ))
          ) : (
            <Text style={styles.emptyText}>Start browsing to see your most visited sites.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bookmark" size={20} color="#333" />
          <Text style={styles.sectionTitle}>Bookmarks</Text>
        </View>
        <View style={styles.grid}>
          {recentBookmarks.length > 0 ? (
            recentBookmarks.map((site) => (
              <SiteItem key={site.id} url={site.url} title={site.title} />
            ))
          ) : (
            <Text style={styles.emptyText}>No bookmarks yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.accountabilityCard}>
        <Ionicons name="eye" size={24} color="#F44336" />
        <Text style={styles.cardTitle}>Accountability Reminder</Text>
        <Text style={styles.cardText}>
          Everything is recorded. You cannot hide from your own time. Spend it on what matters.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 20,
  },
  lifeHeader: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  quoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 26,
    fontWeight: '300',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  usageComparison: {
    marginTop: 10,
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  bar: {
    height: '100%',
  },
  barActive: {
    height: '100%',
    borderRadius: 4,
  },
  comparisonText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  sinkSection: {
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  sinkTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sinkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  sinkDomain: {
    fontSize: 14,
    color: '#555',
  },
  sinkDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  siteItem: {
    width: '21%', // 4 items per row approximately
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    // Shadow for premium feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favicon: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  fallbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  siteTitle: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    width: '100%',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  accountabilityCard: {
    backgroundColor: '#FFF5F5',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFEBEE',
    marginTop: 20,
    marginBottom: 40,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginVertical: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#C62828',
    lineHeight: 20,
  },
});

export default HomeScreen;
