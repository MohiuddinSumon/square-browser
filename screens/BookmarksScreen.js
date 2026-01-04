import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const BookmarksScreen = () => {
  const { bookmarks, navigateTo, toggleBookmark } = useBrowser();

  const handleBookmarkPress = (url) => {
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
      style={styles.bookmarkItem}
      onPress={() => handleBookmarkPress(item.url)}
    >
      <View style={styles.bookmarkIcon}>
        <Ionicons name="bookmark" size={24} color="#FFD700" />
      </View>
      <View style={styles.bookmarkContent}>
        <Text style={styles.bookmarkTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.bookmarkUrl} numberOfLines={1}>
          {item.url}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleBookmarkRemove(item)}
      >
        <Ionicons name="close-circle" size={24} color="#999" />
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <Text style={styles.headerSubtitle}>
          {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
        </Text>
      </View>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmarkItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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

