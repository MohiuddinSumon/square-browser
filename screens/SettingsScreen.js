import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, SafeAreaView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import Constants from 'expo-constants';

const SettingsScreen = ({ navigation }) => {
  const { history, bookmarks, desktopMode, setDesktopMode, adBlockEnabled, setAdBlockEnabled } = useBrowser();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleExportHistory = () => {
    // Future: Implement export functionality
    alert('Export functionality will be available in a future update');
  };

  const handleAbout = () => {
    alert(
      'OpenBrowser\n\n' +
      'A mobile internet browser built for accountability and digital self-care.\n\n' +
      'Version: ' + appVersion + '\n\n' +
      'All browsing activity is logged and cannot be cleared or hidden.'
    );
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const handleViewBookmarks = () => {
    navigation.navigate('Bookmarks');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browser Settings</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.rowLead}>
            <Ionicons name="desktop" size={20} color="#2196F3" />
            <Text style={styles.infoLabel}>Desktop Mode</Text>
          </View>
          <Switch
            value={desktopMode}
            onValueChange={setDesktopMode}
            trackColor={{ false: '#767577', true: '#2196F3' }}
            thumbColor={desktopMode ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.rowLead}>
            <Ionicons name="shield-checkmark" size={20} color="#2196F3" />
            <Text style={styles.infoLabel}>Ad Blocker</Text>
          </View>
          <Switch
            value={adBlockEnabled}
            onValueChange={setAdBlockEnabled}
            trackColor={{ false: '#767577', true: '#2196F3' }}
            thumbColor={adBlockEnabled ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleViewHistory}>
          <Ionicons name="time" size={20} color="#2196F3" />
          <Text style={styles.buttonText}>Browsing History</Text>
          <View style={styles.buttonBadge}>
            <Text style={styles.buttonBadgeText}>{history.length}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleViewBookmarks}>
          <Ionicons name="bookmark" size={20} color="#2196F3" />
          <Text style={styles.buttonText}>Bookmarks</Text>
          <View style={styles.buttonBadge}>
            <Text style={styles.buttonBadgeText}>{bookmarks.length}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Name</Text>
          <Text style={styles.infoValue}>OpenBrowser</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{appVersion}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>History Entries</Text>
          <Text style={styles.infoValue}>{history.length}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bookmarks</Text>
          <Text style={styles.infoValue}>{bookmarks.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.featureText}>Uneditable browsing history</Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.featureText}>No incognito mode</Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.featureText}>Complete transparency</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          OpenBrowser is a mobile internet browser built for those who want to reclaim control over their digital habits. 
          With no incognito or hidden modes, OpenBrowser ensures complete transparency in all your online activity.
        </Text>
        <Text style={styles.aboutText}>
          Every site you visit is tracked and stored—helping you become more accountable and aware.
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.button} onPress={handleAbout}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.buttonText}>About OpenBrowser</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All browsing history is stored locally on your device and cannot be deleted.
        </Text>
      </View>
    </ScrollView>
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
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  rowLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#2196F3',
  },
  buttonBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  buttonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  footer: {
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SettingsScreen;

