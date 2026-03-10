/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * HistoryScreen - Displays browsing history grouped by date with collapsible date sections
 */
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const HistoryScreen = ({ navigation }) => {
  const { history, navigateTo, isDarkMode } = useBrowser();

  // Track collapsed state for each date
  const [collapsedDates, setCollapsedDates] = useState({});

  const colors = {
    bg: isDarkMode ? '#121212' : '#fff',
    card: isDarkMode ? '#1e1e1e' : '#fff',
    headerBg: isDarkMode ? '#1e1e1e' : '#f5f5f5',
    text: isDarkMode ? '#e0e0e0' : '#333',
    subtext: isDarkMode ? '#999' : '#666',
    border: isDarkMode ? '#333' : '#e0e0e0',
    itemBorder: isDarkMode ? '#2c2c2c' : '#f0f0f0',
    sectionHeader: isDarkMode ? '#1a1a1a' : '#f9f9f9',
    accent: '#2196F3',
  };

  // Toggle collapse state for a date
  const toggleDateCollapse = (dateKey) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups = {};
    const sortedHistory = [...history].reverse(); // Most recent first

    sortedHistory.forEach((entry) => {
      const date = new Date(entry.timestamp);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });

    return Object.entries(groups).map(([date, entries]) => ({
      date,
      entries,
      dateKey: date.replace(/[^a-zA-Z0-9]/g, '_'), // Create a valid key for state
    }));
  }, [history]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleHistoryItemPress = (url) => {
    navigation.navigate('Browser');
    navigateTo(url);
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleHistoryItemPress(item.url)}
    >
      <View style={styles.historyItemContent}>
        <View style={styles.historyItemHeader}>
          <Text style={styles.historyTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text style={styles.historyUrl} numberOfLines={1}>
          {item.url}
        </Text>
        {item.visitCount > 1 && (
          <Text style={styles.visitCount}>
            Visited {item.visitCount} times
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }) => {
    const isCollapsed = collapsedDates[section.dateKey];

    return (
      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: colors.sectionHeader, borderBottomColor: colors.border }]}
        onPress={() => toggleDateCollapse(section.dateKey)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionHeaderText, { color: colors.subtext }]}>{section.date}</Text>
          <Text style={[styles.entryCount, { color: colors.subtext }]}>
            ({section.entries.length} {section.entries.length === 1 ? 'entry' : 'entries'})
          </Text>
        </View>
        <Ionicons
          name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
          size={20}
          color={colors.subtext}
        />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No browsing history yet</Text>
      <Text style={styles.emptySubtext}>
        Your browsing history will appear here
      </Text>
    </View>
  );

  // Flatten grouped history for FlatList, excluding collapsed sections
  const flatListData = useMemo(() => {
    const result = [];

    groupedHistory.forEach((group) => {
      // Always add the header (include entries for count display)
      result.push({ type: 'header', date: group.date, dateKey: group.dateKey, entries: group.entries });

      // Only add entries if not collapsed
      if (!collapsedDates[group.dateKey]) {
        group.entries.forEach((entry) => {
          result.push({ type: 'item', ...entry });
        });
      }
    });

    return result;
  }, [groupedHistory, collapsedDates]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.headerBg }]}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Browsing History</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
              {history.length} {history.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
        </View>
        <FlatList
          data={flatListData}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.date}` : item.id || `item-${index}`
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderSectionHeader({ section: item });
            }
            return renderHistoryItem({ item });
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={64} color={isDarkMode ? '#333' : '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>No browsing history yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
                Your browsing history will appear here
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          extraData={collapsedDates} // Re-render when collapse state changes
        />
      </View>
    </SafeAreaView>
  );
};

// Helper for relative time
const formatDurationLabel = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  entryCount: {
    fontSize: 13,
    color: '#999',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  historyItemContent: {
    flex: 1,
    marginRight: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  historyUrl: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  visitCount: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HistoryScreen;