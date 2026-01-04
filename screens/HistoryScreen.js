import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const HistoryScreen = ({ navigation }) => {
  const { history, navigateTo, isDarkMode } = useBrowser();

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

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.date}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No browsing history yet</Text>
      <Text style={styles.emptySubtext}>
        Your browsing history will appear here
      </Text>
    </View>
  );

  // Flatten grouped history for FlatList
  const flatListData = groupedHistory.flatMap((group) => [
    { type: 'header', date: group.date },
    ...group.entries.map((entry) => ({ type: 'item', ...entry })),
  ]);

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
            return (
              <View style={[styles.sectionHeader, { backgroundColor: colors.sectionHeader, borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionHeaderText, { color: colors.subtext }]}>{item.date}</Text>
              </View>
            );
          }
          return (
            <TouchableOpacity
              style={[styles.historyItem, { backgroundColor: colors.card, borderBottomColor: colors.itemBorder }]}
              onPress={() => handleHistoryItemPress(item.url)}
            >
              <View style={styles.historyItemContent}>
                <View style={styles.historyItemHeader}>
                  <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.historyTime, { color: colors.subtext }]}>{formatDurationLabel(item.timestamp)}</Text>
                </View>
                <Text style={[styles.historyUrl, { color: colors.subtext }]} numberOfLines={1}>
                  {item.url}
                </Text>
                {item.visitCount > 1 && (
                  <Text style={[styles.visitCount, { color: colors.subtext }]}>
                    Visited {item.visitCount} times
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#555' : '#ccc'} />
            </TouchableOpacity>
          );
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
      />
      </View>
    </SafeAreaView>
  );
};

// Helper for relative time (not really needed but lets fix the missing formatTime label usage)
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
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

