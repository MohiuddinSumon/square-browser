/**
 * Copyright (c) 2025 SquareBrowser Contributors
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, SafeAreaView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

const BookmarksScreen = ({ navigation }) => {
  const { bookmarks, navigateTo, toggleBookmark, isDarkMode, t } = useBrowser();
  const theme = getTheme(isDarkMode);
  const { colors, spacing, borderRadius, typography, shadows, animation, touchTarget } = theme;

  const [searchQuery, setSearchQuery] = useState('');

  const handleBookmarkPress = (url) => {
    navigation.navigate('Browser');
    navigateTo(url);
  };

  const handleBookmarkRemove = (bookmark) => {
    Alert.alert(
      t('bookmarks.removeTitle'),
      t('bookmarks.removeMessage', { title: bookmark.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => toggleBookmark(bookmark.url, bookmark.title),
        },
      ]
    );
  };

  const filteredBookmarks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter(
      (b) =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.url && b.url.toLowerCase().includes(q))
    );
  }, [bookmarks, searchQuery]);

  const getInitial = (title) => {
    const t = (title || '').trim();
    return t ? t.charAt(0).toUpperCase() : 'B';
  };

  const renderBookmarkItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [
        styles.bookmarkItem,
        {
          backgroundColor: colors.surface,
          transform: [{ scale: pressed ? animation.pressScale : 1 }],
          opacity: pressed ? animation.pressOpacity : 1,
        },
      ]}
      onPress={() => handleBookmarkPress(item.url)}
    >
      <View style={[styles.bookmarkIcon, { backgroundColor: colors.accent }]}>
        <Text style={[styles.bookmarkInitial, { color: colors.textOnPrimary }]}>
          {getInitial(item.title)}
        </Text>
      </View>
      <View style={styles.bookmarkContent}>
        <Text style={[styles.bookmarkTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.bookmarkUrl, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.url}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.removeButton,
          { backgroundColor: colors.dangerSoft },
          { transform: [{ scale: pressed ? animation.pressScale : 1 }], opacity: pressed ? animation.pressOpacity : 1 },
        ]}
        hitSlop={4}
        onPress={() => handleBookmarkRemove(item)}
      >
        <Ionicons name="close" size={20} color={colors.danger} />
      </Pressable>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('bookmarks.empty')}</Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        {t('bookmarks.emptyHint')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.groupedBackground }]}>
      <View style={[styles.container, { backgroundColor: colors.groupedBackground }]}>
        <ScreenHeader
          title={t('bookmarks.title')}
          subtitle={t('bookmarks.count', { count: bookmarks.length })}
          onBack={() => navigation.goBack()}
        />

        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.md }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('bookmarks.search')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.clearButton, { opacity: pressed ? animation.pressOpacity : 1 }]}
              hitSlop={4}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <FlatList
          data={filteredBookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmarkItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    minHeight: 44,
  },
  bookmarkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookmarkContent: {
    flex: 1,
    marginRight: 12,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  bookmarkUrl: {
    fontSize: 14,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BookmarksScreen;