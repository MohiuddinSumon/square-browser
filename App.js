import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
  const { canGoBack, canGoForward, goBack, goForward, refresh, navigateTo } = useBrowser();

  const handleHome = () => {
    navigation.navigate('Browser');
    navigateTo('https://www.google.com');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
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
        style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
        onPress={goBack}
        disabled={!canGoBack}
      >
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={canGoBack ? '#2196F3' : '#ccc'} 
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
        onPress={goForward}
        disabled={!canGoForward}
      >
        <Ionicons 
          name="arrow-forward" 
          size={24} 
          color={canGoForward ? '#2196F3' : '#ccc'} 
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={refresh}
      >
        <Ionicons name="refresh" size={24} color="#2196F3" />
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
  navButtonDisabled: {
    opacity: 0.5,
  },
});
