import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TermsOfServiceScreen = ({ navigation }) => {
  const { isDarkMode } = useBrowser();

  const colors = {
    bg: isDarkMode ? '#121212' : '#fff',
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
        <Text style={[styles.date, { color: colors.subtext }]}>Last Updated: January 4, 2026</Text>
        
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          By installing and using OpenBrowser, you acknowledge that this is an accountability-focused tool.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>2. Use of the App</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          You agree to use OpenBrowser for mindful browsing. You understand that the app is designed to record your history permanently to provide full transparency and accountability.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>3. No Incognito/Private Mode</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          OpenBrowser does not offer a private browsing mode. Every action performed within the browser is logged locally.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>4. Limitation of Liability</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          OpenBrowser is provided "as is". We are not responsible for any content viewed or the impact of permanent history logging on your personal or professional life.
        </Text>

        <Text style={[styles.footer, { color: colors.subtext }]}>
          This app is a tool for self-discipline. Use it wisely.
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

export default TermsOfServiceScreen;
