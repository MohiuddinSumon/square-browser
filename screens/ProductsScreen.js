/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * ProductsScreen.js - Products and projects listing
 */
import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';

const PRODUCTS = [
  {
    id: 'loveledger',
    name: 'LoveLedger',
    description: 'Track your relationship journey',
    url: 'https://loveledger.squarebrowser.com/',
    icon: 'heart-outline',
    color: '#FF6B9D',
  },
  {
    id: 'logbook',
    name: 'Logbook',
    description: 'Personal journaling and logging',
    url: 'https://logbook.squarebrowser.com/',
    icon: 'book-outline',
    color: '#4CAF50',
  },
  {
    id: 'fellowcoder',
    name: 'Fellow Coder',
    description: 'Developer community and resources',
    url: 'https://www.fellowcoder.com/',
    icon: 'code-slash-outline',
    color: '#2196F3',
  },
];

const ProductsScreen = ({ navigation }) => {
  const { navigateTo, isDarkMode } = useBrowser();
  const theme = getTheme(isDarkMode);
  const { colors } = theme;

  const handleProductPress = useCallback((url) => {
    navigation.navigate('Browser');
    navigateTo(url);
  }, [navigation, navigateTo]);

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={({ pressed }) => [
        styles.productItem,
        { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderBottomColor: colors.separator },
        pressed && { opacity: 0.6 },
      ]}
      onPress={() => handleProductPress(item.url)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
    >
      <View style={[styles.productIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.productContent}>
        <Text style={[styles.productTitle, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.productDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
        <Text style={[styles.productUrl, { color: colors.accent }]} numberOfLines={1}>
          {item.url.replace('https://', '').replace('http://', '').replace(/\/$/, '')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={styles.chevron} />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No products yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Check back soon for new projects.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.groupedBackground }]}>
      <View style={[styles.container, { backgroundColor: colors.groupedBackground }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.separator }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Products</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Explore other projects
            </Text>
          </View>
        </View>

        <FlatList
          data={PRODUCTS}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          accessibilityLabel="Products list"
          accessibilityRole="list"
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
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 12,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  productIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productContent: {
    flex: 1,
    marginRight: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    marginBottom: 6,
  },
  productUrl: {
    fontSize: 12,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});