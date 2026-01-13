/**
 * Copyright (c) 2025 OpenBrowser Contributors
 * 
 * App.js - Main application entry point
 * Sets up navigation and provides browser context to all screens
 */
import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { BrowserProvider, useBrowser } from './context/BrowserContext';
import BrowserScreen from './screens/BrowserScreen';
import HistoryScreen from './screens/HistoryScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import { StatusBar } from 'expo-status-bar';

const Stack = createStackNavigator();

// Custom Bottom Navigation Bar Component
const CustomBottomNav = () => {
  const navigation = useNavigation();
  const { tabs, setShowTabSwitcher, navigateTo, isDarkMode } = useBrowser();

  const handleHome = () => {
    navigateTo('about:blank');
    navigation.navigate('Browser');
  };

  const handleTabs = () => {
    setShowTabSwitcher(true);
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const colors = {
    bg: isDarkMode ? '#1e1e1e' : '#fff',
    border: isDarkMode ? '#333' : '#e0e0e0',
    icon: isDarkMode ? '#999' : '#2196F3',
    badge: '#2196F3',
    badgeText: '#fff',
    badgeBorder: isDarkMode ? '#1e1e1e' : '#fff',
  };

  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={handleHome}
      >
        <Ionicons name="home-outline" size={24} color={colors.icon} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={handleTabs}
      >
        <View style={styles.tabsIconContainer}>
          <Ionicons name="copy-outline" size={24} color={colors.icon} />
          <View style={[styles.tabCountBadge, { backgroundColor: colors.badge, borderColor: colors.badgeBorder }]}>
            <Text style={[styles.tabCountText, { color: colors.badgeText }]}>{tabs.length}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={handleSettings}
      >
        <Ionicons name="settings-outline" size={24} color={colors.icon} />
      </TouchableOpacity>
    </View>
  );
};

// Component to handle incoming URLs
const UrlHandler = () => {
  const { navigateTo } = useBrowser();
  const navigation = useNavigation();

  useEffect(() => {
    // Handle URL when app is opened from a link
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        navigation.navigate('Browser');
        navigateTo(initialUrl);
      }
    };

    // Handle URL when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      navigation.navigate('Browser');
      navigateTo(url);
    });

    handleInitialUrl();

    return () => {
      subscription.remove();
    };
  }, [navigateTo, navigation]);

  return null;
};

// Main App Component
function AppNavigator() {
  return (
    <>
      <UrlHandler />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Browser"
      >
        <Stack.Screen name="Browser" component={BrowserScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      </Stack.Navigator>
      <CustomBottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator />
      </NavigationContainer>
    </BrowserProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingBottom: 12,
    height: 60,
  },
  navButton: {
    padding: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsIconContainer: {
    position: 'relative',
    padding: 2,
  },
  tabCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  tabCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
});
