/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * ProductsScreen.js - Products and projects listing
 */
import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

const PRODUCTS = [
  {
    id: 'loveledger',
    name: 'LoveLedger',
    url: 'https://loveledger.squarebrowser.com/',
    icon: 'heart-outline',
    color: '#FF6B9D',
  },
  {
    id: 'logbook',
    name: 'Logbook',
    url: 'https://logbook.squarebrowser.com/',
    icon: 'book-outline',
    color: '#4CAF50',
  },
  {
    id: 'fellowcoder',
    name: 'Fellow Coder',
    url: 'https://www.fellowcoder.com/',
    icon: 'code-slash-outline',
    color: '#2196F3',
  },
];

const ProductsScreen = ({ navigation }) => {
  const { navigateTo, isDarkMode, t } = useBrowser();
  const theme = getTheme(isDarkMode);
  const { colors, borderRadius, shadows, animation } = theme;

  const handleProductPress = useCallback((url) => {
    navigation.navigate('Browser');
    navigateTo(url);
  }, [navigation, navigateTo]);

  const renderProductItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [
        styles.productItem,
        { backgroundColor: colors.surface, borderRadius: borderRadius.md, ...shadows.sm },
        pressed && { opacity: animation.pressOpacity },
      ]}
      onPress={() => handleProductPress(item.url)}
      accessibilityRole="button"
      accessibilityLabel={t('products.open', { name: item.name })}
    >
      <View style={[styles.productIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.productContent}>
        <Text style={[styles.productTitle, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.productDescription, { color: colors.textSecondary }]}>
          {t('products.' + item.id)}
        </Text>
        <Text style={[styles.productUrl, { color: colors.accent }]} numberOfLines={1}>
          {item.url.replace('https://', '').replace('http://', '').replace(/\/$/, '')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={styles.chevron} />
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('products.empty')}</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('products.emptyHint')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.groupedBackground }]}>
      <View style={[styles.container, { backgroundColor: colors.groupedBackground }]}>
        <ScreenHeader
          title={t('products.title')}
          subtitle={t('products.subtitle')}
          onBack={() => navigation.goBack()}
        />

        <FlatList
          data={PRODUCTS}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          accessibilityLabel={t('products.list')}
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
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
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
export default ProductsScreen;
