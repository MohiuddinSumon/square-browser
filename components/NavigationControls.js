import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const NavigationControls = () => {
  const { canGoBack, canGoForward, goBack, goForward, refresh, navigateTo } = useBrowser();

  const handleHome = () => {
    navigateTo('https://www.google.com');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !canGoBack && styles.buttonDisabled]}
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
        style={[styles.button, !canGoForward && styles.buttonDisabled]}
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
        style={styles.button}
        onPress={refresh}
      >
        <Ionicons name="refresh" size={24} color="#2196F3" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleHome}
      >
        <Ionicons name="home" size={24} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  button: {
    padding: 6,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default NavigationControls;

