/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * TermsOfServiceScreen.js - Terms of service (legal) screen
 */
import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import { getTheme } from '../theme';

const TermsOfServiceScreen = ({ navigation }) => {
  const { isDarkMode } = useBrowser();
  const theme = getTheme(isDarkMode);
  const { colors } = theme;

  const sections = [
    {
      title: '1. Acceptance of Terms',
      body: 'By installing and using SquareBrowser, you acknowledge that this is an accountability-focused tool.',
    },
    {
      title: '2. Use of the App',
      body: 'You agree to use SquareBrowser for mindful browsing. You understand that the app is designed to record your history permanently to provide full transparency and accountability.',
    },
    {
      title: '3. No Incognito/Private Mode',
      body: 'SquareBrowser does not offer a private browsing mode. Every action performed within the browser is logged locally.',
    },
    {
      title: '4. Limitation of Liability',
      body: 'SquareBrowser is provided “as is”. We are not responsible for any content viewed or the impact of permanent history logging on your personal or professional life.',
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
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
          This app is a tool for self-discipline. Use it wisely.
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