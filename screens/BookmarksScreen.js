import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const BookmarksScreen = ({ navigation }) => {
  const { bookmarks, navigateTo, toggleBookmark, isDarkMode } = useBrowser();

  const colors = {
    bg: isDarkMode ? '#121212' : '#fff',
    card: isDarkMode ? '#1e1e1e' : '#fff',
    headerBg: isDarkMode ? '#1e1e1e' : '#f5f5f5',
    text: isDarkMode ? '#e0e0e0' : '#333',
    subtext: isDarkMode ? '#999' : '#666',
    border: isDarkMode ? '#333' : '#e0e0e0',
    itemBorder: isDarkMode ? '#2c2c2c' : '#f0f0f0',
    accent: '#2196F3',
  };

  const handleBookmarkPress = (url) => {
    navigation.navigate('Browser');
    navigateTo(url);
  };

  const handleBookmarkRemove = (bookmark) => {
    Alert.alert(
      'Remove Bookmark',
      `Remove "${bookmark.title}" from bookmarks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => toggleBookmark(bookmark.url, bookmark.title),
        },
      ]
    );
  };

  const renderBookmarkItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.bookmarkItem, { backgroundColor: colors.card, borderBottomColor: colors.itemBorder }]}
      onPress={() => handleBookmarkPress(item.url)}
    >
      <View style={styles.bookmarkIcon}>
        <Ionicons name="bookmark" size={24} color="#FFD700" />
      </View>
      <View style={styles.bookmarkContent}>
        <Text style={[styles.bookmarkTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.bookmarkUrl, { color: colors.subtext }]} numberOfLines={1}>
          {item.url}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleBookmarkRemove(item)}
      >
        <Ionicons name="close-circle" size={24} color={isDarkMode ? '#555' : '#999'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No bookmarks yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the bookmark icon in the address bar to save pages
      </Text>
    </View>
  );

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bookmarks</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
            {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
          </Text>
        </View>
      </View>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmarkItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color={isDarkMode ? '#333' : '#ccc'} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>No bookmarks yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
              Tap the bookmark icon in the address bar to save pages
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
      </View>
    </SafeAreaView>
  );
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
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  bookmarkIcon: {
    marginRight: 12,
  },
  bookmarkContent: {
    flex: 1,
    marginRight: 12,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  bookmarkUrl: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 4,
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

export default BookmarksScreen;

