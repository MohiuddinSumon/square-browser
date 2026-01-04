import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const AddressBar = () => {
  const { currentUrl, navigateTo, toggleBookmark, checkIsBookmarked } = useBrowser();
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    setUrlInput(currentUrl);
    // Check if current URL is bookmarked
    checkIsBookmarked(currentUrl).then(setIsBookmarked);
  }, [currentUrl, checkIsBookmarked]);

  const handleGo = () => {
    if (urlInput.trim()) {
      navigateTo(urlInput.trim());
    }
  };

  const handleBookmarkToggle = () => {
    toggleBookmark(currentUrl).then((bookmarked) => {
      setIsBookmarked(bookmarked);
    });
  };

  const getSecureIcon = () => {
    if (currentUrl.startsWith('https://')) {
      return 'lock-closed';
    }
    return 'lock-open';
  };

  return (
    <View style={[styles.container, keyboardVisible && styles.containerKeyboardVisible]}>
      <View style={styles.addressBarContainer}>
        <View style={styles.urlContainer}>
          <Ionicons 
            name={getSecureIcon()} 
            size={14} 
            color={currentUrl.startsWith('https://') ? '#4CAF50' : '#FF9800'} 
            style={styles.lockIcon}
          />
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleGo}
            placeholder="Enter URL or search"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
          />
        </View>
        {!keyboardVisible && (
          <>
            <TouchableOpacity 
              style={styles.bookmarkButton}
              onPress={handleBookmarkToggle}
            >
              <Ionicons 
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                size={20} 
                color={isBookmarked ? '#FFD700' : '#666'} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.goButton}
              onPress={handleGo}
            >
              <Ionicons name="arrow-forward" size={20} color="#2196F3" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  containerKeyboardVisible: {
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  addressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 36,
  },
  lockIcon: {
    marginRight: 6,
  },
  urlInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    paddingVertical: 0,
    margin: 0,
  },
  bookmarkButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddressBar;

