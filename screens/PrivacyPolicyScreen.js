/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * PrivacyPolicyScreen.js - Privacy policy (legal) screen
 */
import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';

const PrivacyPolicyScreen = ({ navigation }) => {
  const { isDarkMode } = useBrowser();
  const theme = getTheme(isDarkMode);
  const { colors } = theme;

  const sections = [
    {
      title: '1. Introduction',
      body: 'SquareBrowser is committed to your privacy. This policy explains how we handle your data.',
    },
    {
      title: '2. Local Storage Only',
      body: (
        <Text>
          All your browsing history, bookmarks, and usage statistics are stored{' '}
          <Text style={{ fontWeight: 'bold' }}>locally on your device</Text>. We do not use any external
          servers to store your personal browsing data.
        </Text>
      ),
    },
    {
      title: '3. Accountability Focus',
      body: 'To promote mindful browsing, history is permanent and cannot be deleted within the app. No incognito mode is provided.',
    },
    {
      title: '4. Data Collection',
      body: 'We do not collect or sell your data to third parties. Your data is yours, kept on your device for your own accountability.',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.groupedBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.separator }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>Last Updated: January 4, 2026</Text>

        {sections.map((section, index) => (
          <View
            key={index}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderRadius: theme.borderRadius.md },
              theme.shadows.sm,
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>{section.title}</Text>
            <Text style={[styles.text, { color: colors.text }]}>{section.body}</Text>
          </View>
        ))}

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          By using SquareBrowser, you agree to this local-first privacy approach.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 12, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  date: { fontSize: 14, marginBottom: 20 },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  text: { fontSize: 17, lineHeight: 24 },
  footer: { marginTop: 10, fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
});