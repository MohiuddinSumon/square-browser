/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * App.js - Main application entry point
 * Sets up navigation and provides browser context to all screens
 */
import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrowserProvider, useBrowser } from './context/BrowserContext';
import BrowserScreen from './screens/BrowserScreen';
import HistoryScreen from './screens/HistoryScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import ProductsScreen from './screens/ProductsScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import LandingPage from './components/LandingPage';
import { StatusBar } from 'expo-status-bar';
import { getTheme } from './theme';

const Stack = createStackNavigator();

// Format a Date as "HH:MM" in 24h local time.
const formatTime = (date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Custom Bottom Navigation Bar Component
const CustomBottomNav = () => {
  const navigation = useNavigation();
  const { tabs, setShowTabSwitcher, navigateTo, isDarkMode,
          timerEnabled, limitReached, strictMode } = useBrowser();
  const timerWallActive = timerEnabled && limitReached && strictMode;
  const insets = useSafeAreaInsets();
  const theme = getTheme(isDarkMode);
  const { colors, typography, touchTarget, animation } = theme;

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

  // Midnight rollover time when the daily limit resets.
  const resetAt = new Date();
  resetAt.setHours(24, 0, 0, 0);

  const navButtonStyle = ({ pressed }) => [
    styles.navButton,
    { minHeight: touchTarget.min },
    timerWallActive && styles.navButtonDisabled,
    pressed && {
      transform: [{ scale: animation.pressScale }],
      opacity: animation.pressOpacity,
    },
  ];

  const navLabelStyle = ({ pressed }) => [
    styles.navLabel,
    { color: colors.textSecondary },
    pressed && { opacity: animation.pressOpacity },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.tabBarBackground, borderTopColor: colors.separator, paddingBottom: insets.bottom || 8 }]}>
      {timerWallActive && (
        <View style={[styles.timerBanner, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <Text style={[styles.timerBannerText, { color: colors.text }]}>
            Daily limit reached. Browsing resumes at {formatTime(resetAt)}.
          </Text>
        </View>
      )}

      <Pressable
        style={navButtonStyle}
        onPress={timerWallActive ? undefined : handleHome}
        disabled={timerWallActive}
        accessibilityRole="button"
        accessibilityLabel="Home"
      >
        <Ionicons name="home-outline" size={22} color={colors.textSecondary} />
        <Text style={navLabelStyle}>Home</Text>
      </Pressable>

      <Pressable
        style={navButtonStyle}
        onPress={timerWallActive ? undefined : handleTabs}
        disabled={timerWallActive}
        accessibilityRole="button"
        accessibilityLabel="Tabs"
      >
        <View style={styles.tabsIconContainer}>
          <Ionicons name="copy-outline" size={22} color={colors.textSecondary} />
          <View style={[styles.tabCountBadge, { backgroundColor: colors.accent, borderColor: colors.tabBarBackground }]}>
            <Text style={[styles.tabCountText, { color: colors.textOnPrimary }]}>{tabs.length}</Text>
          </View>
        </View>
        <Text style={navLabelStyle}>Tabs</Text>
      </Pressable>

      <Pressable
        style={navButtonStyle}
        onPress={timerWallActive ? undefined : handleSettings}
        disabled={timerWallActive}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        <Text style={navLabelStyle}>Settings</Text>
      </Pressable>
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

// Status bar styled from the active theme so icons contrast against the nav bar.
const ThemedStatusBar = () => {
  const { isDarkMode } = useBrowser();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} />;
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
        <Stack.Screen name="Products" component={ProductsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      {Platform.OS !== 'web' && <CustomBottomNav />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <BrowserProvider>
        <NavigationContainer>
          <ThemedStatusBar />
          <AppNavigator />
        </NavigationContainer>
      </BrowserProvider>
    </SafeAreaProvider>
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
    borderTopWidth: 1,
    paddingTop: 6,
  },
  navButton: {
    padding: 6,
    minWidth: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 15,
    marginTop: 2,
  },
  tabsIconContainer: {
    position: 'relative',
    padding: 1,
  },
  tabCountBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  timerBanner: {
    position: 'absolute',
    top: -44,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerBannerText: {
    flex: 1,
    fontSize: 15,
  },
});