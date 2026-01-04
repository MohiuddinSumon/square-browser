import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BrowserProvider } from './context/BrowserContext';
import BrowserScreen from './screens/BrowserScreen';
import HistoryScreen from './screens/HistoryScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import SettingsScreen from './screens/SettingsScreen';
import { StatusBar } from 'expo-status-bar';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <BrowserProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Browser') {
                iconName = focused ? 'globe' : 'globe-outline';
              } else if (route.name === 'History') {
                iconName = focused ? 'time' : 'time-outline';
              } else if (route.name === 'Bookmarks') {
                iconName = focused ? 'bookmark' : 'bookmark-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#2196F3',
            tabBarInactiveTintColor: '#999',
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              paddingBottom: 4,
              paddingTop: 4,
              height: 60,
            },
          })}
        >
          <Tab.Screen 
            name="Browser" 
            component={BrowserScreen}
            options={{
              tabBarLabel: 'Browser',
            }}
          />
          <Tab.Screen 
            name="History" 
            component={HistoryScreen}
            options={{
              tabBarLabel: 'History',
            }}
          />
          <Tab.Screen 
            name="Bookmarks" 
            component={BookmarksScreen}
            options={{
              tabBarLabel: 'Bookmarks',
            }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </BrowserProvider>
  );
}
