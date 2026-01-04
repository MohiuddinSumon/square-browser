import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrowserProvider, useBrowser } from './context/BrowserContext';
import BrowserScreen from './screens/BrowserScreen';
import HistoryScreen from './screens/HistoryScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import SettingsScreen from './screens/SettingsScreen';
import { StatusBar } from 'expo-status-bar';

const Stack = createStackNavigator();

// Custom Bottom Navigation Bar Component
const CustomBottomNav = () => {
  const navigation = useNavigation();
  const { tabs, setShowTabSwitcher, navigateTo } = useBrowser();

  const handleHome = () => {
    navigation.navigate('Browser');
    navigateTo('about:blank');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleTabs = () => {
    setShowTabSwitcher(true);
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={handleHome}
      >
        <Ionicons name="home" size={24} color="#2196F3" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={handleTabs}
      >
        <View style={styles.tabsIconContainer}>
          <Ionicons name="copy-outline" size={24} color="#2196F3" />
          <View style={styles.tabCountBadge}>
            <Text style={styles.tabCountText}>{tabs.length}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={handleSettings}
      >
        <Ionicons name="settings" size={24} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );
};

// Main App Component
function AppNavigator() {
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Browser"
      >
        <Stack.Screen name="Browser" component={BrowserScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
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
