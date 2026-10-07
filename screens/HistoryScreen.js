/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * HistoryScreen - Displays browsing history grouped by date with collapsible date sections
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, TextInput, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';

const TIME_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
];

const HistoryScreen = ({ navigation }) => {
  const { history, navigateTo, isDarkMode } = useBrowser();
  const theme = getTheme(isDarkMode);
  const colors = theme.colors;

  // Track collapsed state for each date
  const [collapsedDates, setCollapsedDates] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  // Animated values per date group (chevron rotation + content fade/slide)
  const animatedValues = useRef({});

  const getAnimValue = (dateKey) => {
    if (!animatedValues.current[dateKey]) {
      animatedValues.current[dateKey] = new Animated.Value(1);
    }
    return animatedValues.current[dateKey];
  };

  // Toggle collapse state for a date, animating chevron + content smoothly
  const toggleDateCollapse = (dateKey) => {
    const anim = getAnimValue(dateKey);
    const willCollapse = !collapsedDates[dateKey];
    if (willCollapse) {
      Animated.timing(anim, {
        toValue: 0,
        duration: theme.animation.normal,
        useNativeDriver: true,
      }).start(() => {
        setCollapsedDates(prev => ({ ...prev, [dateKey]: true }));
      });
    } else {
      setCollapsedDates(prev => ({ ...prev, [dateKey]: false }));
      Animated.timing(anim, {
        toValue: 1,
        duration: theme.animation.normal,
        useNativeDriver: true,
      }).start();
    }
  };

  // Filter history by search query and time window
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

    const q = searchQuery.trim().toLowerCase();
    return history.filter((entry) => {
      const ts = new Date(entry.timestamp);
      if (timeFilter === 'today' && ts < startOfToday) return false;
      if (timeFilter === 'week' && ts < startOfWeek) return false;
      if (q) {
        const title = (entry.title || '').toLowerCase();
        const url = (entry.url || '').toLowerCase();
        if (!title.includes(q) && !url.includes(q)) return false;
      }
      return true;
    });
  }, [history, searchQuery, timeFilter]);

  // Group filtered history by date
  const groupedHistory = useMemo(() => {
    const groups = {};
    [...filteredHistory].reverse().forEach((entry) => {
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
  }, [filteredHistory]);

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

  const renderHistoryItem = (entry) => (
    <Pressable
      style={({ pressed }) => [
        styles.historyItem,
        pressed && { opacity: theme.animation.pressOpacity },
      ]}
      onPress={() => handleHistoryItemPress(entry.url)}
    >
      <View style={styles.historyItemContent}>
        <View style={styles.historyItemHeader}>
          <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={[styles.historyTime, { color: colors.textTertiary }]}>{formatTime(entry.timestamp)}</Text>
        </View>
        <Text style={[styles.historyUrl, { color: colors.textSecondary }]} numberOfLines={1}>
          {entry.url}
        </Text>
        {entry.visitCount > 1 && (
          <Text style={[styles.visitCount, { color: colors.textTertiary }]}>
            Visited {entry.visitCount} times
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </Pressable>
  );

  const renderGroup = ({ item }) => {
    const isCollapsed = collapsedDates[item.dateKey];
    const anim = getAnimValue(item.dateKey);
    const chevronRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });
    const contentStyle = {
      opacity: anim,
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
      ],
    };

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }, theme.shadows.sm]}>
        <Pressable
          style={({ pressed }) => [
            styles.sectionHeader,
            pressed && { opacity: theme.animation.pressOpacity },
          ]}
          onPress={() => toggleDateCollapse(item.dateKey)}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{item.date}</Text>
            <Text style={[styles.entryCount, { color: colors.textTertiary }]}>
              ({item.entries.length} {item.entries.length === 1 ? 'entry' : 'entries'})
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
          </Animated.View>
        </Pressable>
        {!isCollapsed && (
          <Animated.View style={contentStyle}>
            {item.entries.map((entry, index) => (
              <View key={entry.id || `${item.dateKey}-${index}`}>
                {index > 0 && <View style={[styles.itemSeparator, { backgroundColor: colors.separator }]} />}
                {renderHistoryItem(entry)}
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name="search" size={18} color={colors.textTertiary} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder="Search history"
        placeholderTextColor={colors.textTertiary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {searchQuery.length > 0 && (
        <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.searchClear}>
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );

  const renderFilterPills = () => (
    <View style={styles.filterRow}>
      {TIME_FILTERS.map((f) => {
        const active = timeFilter === f.key;
        return (
          <Pressable
            key={f.key}
            style={({ pressed }) => [
              styles.filterPill,
              { backgroundColor: active ? colors.accent : colors.surfaceAlt },
              pressed && { opacity: theme.animation.pressOpacity },
            ]}
            onPress={() => setTimeFilter(f.key)}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: active ? colors.textOnPrimary : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.groupedBackground }]}>
      <View style={[styles.container, { backgroundColor: colors.groupedBackground }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.separator }]}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: theme.animation.pressOpacity },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Browsing History</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {filteredHistory.length} {filteredHistory.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
        </View>
        <View style={[styles.searchContainer, { borderBottomColor: colors.separator }]}>
          {renderSearchBar()}
          {renderFilterPills()}
        </View>
        <FlatList
          data={groupedHistory}
          keyExtractor={(item) => item.dateKey}
          renderItem={renderGroup}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery || timeFilter !== 'all' ? 'No matching history' : 'No browsing history yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {searchQuery || timeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Your browsing history will appear here'}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 12,
    marginRight: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    marginLeft: 8,
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: theme.touchTarget.min,
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    minHeight: 44,
    paddingHorizontal: 16,
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
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  entryCount: {
    fontSize: 13,
  },
  itemSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 44,
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
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  historyTime: {
    fontSize: 12,
  },
  historyUrl: {
    fontSize: 15,
    marginBottom: 4,
  },
  visitCount: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HistoryScreen;