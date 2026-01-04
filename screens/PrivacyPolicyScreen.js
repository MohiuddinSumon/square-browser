import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const PrivacyPolicyScreen = ({ navigation }) => {
  const { isDarkMode } = useBrowser();

  const colors = {
    bg: isDarkMode ? '#121212' : '#fff',
    card: isDarkMode ? '#1e1e1e' : '#fff',
    text: isDarkMode ? '#e0e0e0' : '#333',
    subtext: isDarkMode ? '#999' : '#666',
    border: isDarkMode ? '#333' : '#eee',
    accent: '#2196F3',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.date, { color: colors.subtext }]}>Last Updated: January 4, 2026</Text>
        
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>1. Introduction</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          OpenBrowser is committed to your privacy. This policy explains how we handle your data.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>2. Local Storage Only</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          All your browsing history, bookmarks, and usage statistics are stored **locally on your device**. We do not use any external servers to store your personal browsing data.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>3. Accountability Focus</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          To promote mindful browsing, history is permanent and cannot be deleted within the app. No incognito mode is provided.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>4. Data Collection</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We do not collect or sell your data to third parties. Your data is yours, kept on your device for your own accountability.
        </Text>

        <Text style={[styles.footer, { color: colors.subtext }]}>
          By using OpenBrowser, you agree to this local-first privacy approach.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  date: { fontSize: 14, color: '#666', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#2196F3' },
  text: { fontSize: 16, color: '#444', lineHeight: 24 },
  footer: { marginTop: 30, fontSize: 14, fontStyle: 'italic', textAlign: 'center', color: '#666' }
});

export default PrivacyPolicyScreen;
