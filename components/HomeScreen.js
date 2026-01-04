import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const HomeScreen = () => {
  const { history, bookmarks, navigateTo, addTab } = useBrowser();

  // Get top 6 most visited sites
  const mostVisited = useMemo(() => {
    // Group by URL and sum visitCount or just take unique URLs with highest visitCount
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

  // Get recent bookmarks
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
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={48} color="#2196F3" />
        <Text style={styles.welcomeText}>Mindful Browsing</Text>
        <Text style={styles.subtitleText}>Your activity is your accountability.</Text>
      </View>

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
        <Text style={styles.cardTitle}>Mindfulness Reminder</Text>
        <Text style={styles.cardText}>
          Remember: Every site you visit is recorded permanently. This browser is designed to help you stay focused on what matters.
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
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
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
