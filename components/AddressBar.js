import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';

const AddressBar = () => {
  const { currentUrl, navigateTo, toggleBookmark, checkIsBookmarked, isDarkMode } = useBrowser();
  
  const colors = {
    bg: isDarkMode ? '#1e1e1e' : '#fff',
    inputBg: isDarkMode ? '#2c2c2c' : '#fff',
    text: isDarkMode ? '#e0e0e0' : '#333',
    border: isDarkMode ? '#333' : '#e0e0e0',
    accent: '#2196F3',
    secure: '#4CAF50',
    warning: '#FF9800'
  };
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
    const normalizedTarget = currentUrl === 'about:blank' ? '' : currentUrl;
    // Only update input if we aren't currently typing or if the URL change is significant
    if (!keyboardVisible || (urlInput !== normalizedTarget && normalizedTarget !== '')) {
      setUrlInput(normalizedTarget);
    }
    
    // Check if current URL is bookmarked
    if (currentUrl !== 'about:blank') {
      checkIsBookmarked(currentUrl).then(setIsBookmarked);
    } else {
      setIsBookmarked(false);
    }
  }, [currentUrl, checkIsBookmarked, keyboardVisible]);

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
    if (currentUrl === 'about:blank') {
      return 'home';
    }
    if (currentUrl.startsWith('https://')) {
      return 'lock-closed';
    }
    return 'lock-open';
  };

  const currentIconColor = currentUrl === 'about:blank' 
    ? colors.accent 
    : (currentUrl.startsWith('https://') ? colors.secure : colors.warning);

  return (
    <View style={[styles.container, keyboardVisible && styles.containerKeyboardVisible, { borderTopColor: colors.border, borderTopWidth: isDarkMode ? 0 : 1 }]}>
      <View style={styles.addressBarContainer}>
        <View style={[styles.urlContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons 
            name={getSecureIcon()} 
            size={14} 
            color={currentIconColor} 
            style={styles.lockIcon}
          />
          <TextInput
            style={[styles.urlInput, { color: colors.text }]}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleGo}
            placeholder="Enter URL or search"
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
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
                color={isBookmarked ? '#FFD700' : (isDarkMode ? '#999' : '#666')} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.goButton}
              onPress={handleGo}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.accent} />
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
      web: {
        boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
      }
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

