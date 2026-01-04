import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrowser } from '../context/BrowserContext';
import AddressBar from '../components/AddressBar';
import NavigationControls from '../components/NavigationControls';

const BrowserScreen = () => {
  const {
    currentUrl,
    setCurrentUrl,
    setCanGoBack,
    setCanGoForward,
    webViewRef,
    setWebViewRef,
    addHistoryEntry,
  } = useBrowser();
  const webView = useRef(null);

  useEffect(() => {
    setWebViewRef(webView.current);
  }, [setWebViewRef]);

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
  };

  const handleLoadEnd = (navState) => {
    // Log to history when page finishes loading
    if (navState.url && navState.url !== 'about:blank' && !navState.url.startsWith('file://')) {
      // Use title from navState, or extract from URL if not available
      const title = navState.title || navState.url.split('/')[2] || navState.url;
      addHistoryEntry(navState.url, title);
    }
  };

  const handleLoad = (navState) => {
    // Also update URL on load start
    if (navState.url && navState.url !== 'about:blank') {
      setCurrentUrl(navState.url);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.topBar}>
        <NavigationControls />
        <AddressBar />
      </View>
      <WebView
        ref={webView}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoad={handleLoad}
        onLoadEnd={handleLoadEnd}
        onLoadStart={(navState) => {
          if (navState.nativeEvent.url) {
            setCurrentUrl(navState.nativeEvent.url);
          }
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        // Security: prefer HTTPS
        mixedContentMode="never"
        // No incognito mode - all navigation is tracked
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default BrowserScreen;

