import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.date}>Last Updated: January 4, 2026</Text>
        
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.text}>
          OpenBrowser is committed to your privacy. This policy explains how we handle your data.
        </Text>

        <Text style={styles.sectionTitle}>2. Local Storage Only</Text>
        <Text style={styles.text}>
          All your browsing history, bookmarks, and usage statistics are stored **locally on your device**. We do not use any external servers to store your personal browsing data.
        </Text>

        <Text style={styles.sectionTitle}>3. Accountability Focus</Text>
        <Text style={styles.text}>
          To promote mindful browsing, history is permanent and cannot be deleted within the app. No incognito mode is provided.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Collection</Text>
        <Text style={styles.text}>
          We do not collect or sell your data to third parties. Your data is yours, kept on your device for your own accountability.
        </Text>

        <Text style={styles.footer}>
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
