/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * App.js - Main application entry point
 * Sets up navigation and provides browser context to all screens
 */
import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { BrowserProvider, useBrowser } from './context/BrowserContext';
import BrowserScreen from './screens/BrowserScreen';
import HistoryScreen from './screens/HistoryScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import LandingPage from './components/LandingPage';
import { StatusBar } from 'expo-status-bar';

const Stack = createStackNavigator();

// Custom Bottom Navigation Bar Component
const CustomBottomNav = () => {
  const navigation = useNavigation();
  const { tabs, setShowTabSwitcher, navigateTo, isDarkMode,
          timerEnabled, limitReached, strictMode } = useBrowser();
  const timerWallActive = timerEnabled && limitReached && strictMode;

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
        style={[styles.navButton, timerWallActive && styles.navButtonDisabled]}
        onPress={timerWallActive ? undefined : handleHome}
        disabled={timerWallActive}
      >
        <Ionicons name="home-outline" size={22} color={colors.icon} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, timerWallActive && styles.navButtonDisabled]}
        onPress={timerWallActive ? undefined : handleTabs}
        disabled={timerWallActive}
      >
        <View style={styles.tabsIconContainer}>
          <Ionicons name="copy-outline" size={22} color={colors.icon} />
          <View style={[styles.tabCountBadge, { backgroundColor: colors.badge, borderColor: colors.badgeBorder }]}>
            <Text style={[styles.tabCountText, { color: colors.badgeText }]}>{tabs.length}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, timerWallActive && styles.navButtonDisabled]}
        onPress={timerWallActive ? undefined : handleSettings}
        disabled={timerWallActive}
      >
        <Ionicons name="settings-outline" size={22} color={colors.icon} />
      </TouchableOpacity>
    </View>
  );
};

// Component to handle incoming URLs
const UrlHandler = () => {
  const { navigateToNewTab } = useBrowser();
  const navigation = useNavigation();

  useEffect(() => {
    // Handle URL when app is opened from a link
    const handleInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('[UrlHandler] Initial URL:', initialUrl);
          navigation.navigate('Browser');
          // Small delay to ensure Browser screen is mounted
          setTimeout(() => navigateToNewTab(initialUrl), 100);
        }
      } catch (error) {
        console.error('[UrlHandler] Error handling initial URL:', error);
      }
    };

    // Handle URL when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[UrlHandler] Received URL:', url);
      navigation.navigate('Browser');
      // Small delay to ensure Browser screen is mounted
      setTimeout(() => navigateToNewTab(url), 100);
    });

    handleInitialUrl();

    return () => {
      subscription.remove();
    };
  }, [navigateToNewTab, navigation]);

  return null;
};

// Main App Component
function AppNavigator() {
  // Show landing page on web, browser app on mobile
  const initialRoute = Platform.OS === 'web' ? 'Landing' : 'Browser';

  return (
    <>
      <UrlHandler />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen name="Landing" component={LandingPage} options={{ headerShown: false }} />
        <Stack.Screen name="Browser" component={BrowserScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      </Stack.Navigator>
      {Platform.OS !== 'web' && <CustomBottomNav />}
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
    paddingVertical: 6,
    paddingBottom: 8,
    height: 50,
  },
  navButton: {
    padding: 6,
    minWidth: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsIconContainer: {
    position: 'relative',
    padding: 1,
  },
  tabCountBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#2196F3',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  tabCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
});
