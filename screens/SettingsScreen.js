import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, SafeAreaView, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import Constants from 'expo-constants';

const SettingsScreen = ({ navigation }) => {
  const { 
    history, 
    bookmarks, 
    desktopMode, 
    setDesktopMode,
    adBlockEnabled,
    setAdBlockEnabled,
    isDarkMode,
    toggleDarkMode
  } = useBrowser();

  const [appVersion, setAppVersion] = React.useState(Constants.expoConfig?.version || '1.0.0');

  // Colors based on theme
  const colors = {
    bg: isDarkMode ? '#121212' : '#fff',
    card: isDarkMode ? '#1e1e1e' : '#fff',
    text: isDarkMode ? '#e0e0e0' : '#333',
    subtext: isDarkMode ? '#999' : '#666',
    border: isDarkMode ? '#333' : '#eee',
    accent: '#2196F3',
    success: '#4CAF50', // Added for the Status info row
  };

  const handleExportHistory = () => {
    // Future: Implement export functionality
    alert('Export functionality will be available in a future update');
  };

  // handleAbout is no longer used in the new UI, but kept as per instruction format
  const handleAbout = () => {
    alert(
      'OpenBrowser\n\n' +
      'A mobile internet browser built for accountability and digital self-care.\n\n' +
      'Version: ' + appVersion + '\n\n' +
      'All browsing activity is logged and cannot be cleared or hidden.'
    );
  };

  // handleViewHistory and handleViewBookmarks are now directly in onPress
  // const handleViewHistory = () => {
  //   navigation.navigate('History');
  // };

  // const handleViewBookmarks = () => {
  //   navigation.navigate('Bookmarks');
  // };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>Browser Settings</Text>
        
        <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="desktop-outline" size={24} color={colors.subtext} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Desktop Mode</Text>
          </View>
          <Switch 
            value={desktopMode} 
            onValueChange={setDesktopMode}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={desktopMode ? colors.accent : "#f4f3f4"}
          />
        </View>

        <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-outline" size={24} color={colors.subtext} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Ad Blocker</Text>
          </View>
          <Switch 
            value={adBlockEnabled} 
            onValueChange={setAdBlockEnabled}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={adBlockEnabled ? colors.accent : "#f4f3f4"}
          />
        </View>

        <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name={isDarkMode ? "moon" : "sunny-outline"} size={24} color={colors.subtext} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Switch 
            value={isDarkMode} 
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isDarkMode ? colors.accent : "#f4f3f4"}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>Quick Access</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('History')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="time-outline" size={24} color={colors.subtext} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Browsing History</Text>
          </View>
          <View style={[styles.buttonBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.buttonBadgeText}>{history.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Bookmarks')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="bookmark-outline" size={24} color={colors.subtext} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Bookmarks</Text>
          </View>
          <View style={[styles.buttonBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.buttonBadgeText}>{bookmarks.length}</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>About & Legal</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-half-outline" size={24} color={colors.subtext} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="document-text-outline" size={24} color={colors.subtext} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>

        <View style={styles.aboutContainer}>
          <Text style={[styles.aboutText, { color: colors.subtext }]}>
            OpenBrowser is a mobile internet browser built for those who want to reclaim control over their digital habits. 
            With no incognito or hidden modes, OpenBrowser ensures complete transparency in all your online activity.
          </Text>
          <Text style={[styles.aboutText, { color: colors.subtext }]}>
            Your history is permanent and your time is precious. Every minute you spend here is recorded for your own accountability.
          </Text>
        </View>

        <View style={[styles.infoSection, { borderTopColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>App Name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>OpenBrowser</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{appVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>Status</Text>
            <Text style={[styles.infoValue, { color: colors.success || '#4CAF50' }]}>Active Accountability</Text>
          </View>
        </View>

        <Text style={[styles.footerText, { color: colors.subtext }]}>
          OpenBrowser v{appVersion} • Created for Mindfulness
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  buttonBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  buttonBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  aboutContainer: {
    padding: 16,
    marginTop: 20,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    borderTopWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
});

export default SettingsScreen;

