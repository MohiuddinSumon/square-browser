import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useBrowser } from '../context/BrowserContext';
import AddressBar from '../components/AddressBar';
import HomeScreen from '../components/HomeScreen';

const BrowserScreen = () => {
  const {
    currentUrl,
    setCurrentUrl,
    setCanGoBack,
    setCanGoForward,
    webViewRef,
    setWebViewRef,
    addHistoryEntry,
    adBlockEnabled,
    userAgent,
  } = useBrowser();
  const webView = useRef(null);

  useEffect(() => {
    setWebViewRef(webView.current);
  }, [setWebViewRef]);

  const handleNavigationStateChange = (navState) => {
    console.log('Navigation state changed:', navState.url);
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
  };

  const handleLoadEnd = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.log('Page load ended:', nativeEvent.url, nativeEvent.title);
    
    // Log to history when page finishes loading
    if (nativeEvent.url && nativeEvent.url !== 'about:blank' && !nativeEvent.url.startsWith('file://')) {
      // Use title from nativeEvent, or extract from URL if not available
      const title = nativeEvent.title || nativeEvent.url.split('/')[2] || nativeEvent.url;
      console.log('Adding to history:', nativeEvent.url, title);
      addHistoryEntry(nativeEvent.url, title);
    }
  };

  const handleLoad = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    // Also update URL on load start
    if (nativeEvent.url && nativeEvent.url !== 'about:blank') {
      setCurrentUrl(nativeEvent.url);
    }
  };

  const adBlockScript = adBlockEnabled ? `
    (function() {
      const adSelectors = [
        '.adsbygoogle', '[id^="google_ads_"]', '.ad-box', '.ad-container', 
        '.ad-wrapper', '.banner-ad', '.sidebar-ad', '.video-ads',
        '.facebook-ads', '.sponsor-message', '.promoted-content'
      ];
      const removeAds = () => {
        adSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
            el.remove();
          });
        });
      };
      removeAds();
      setTimeout(removeAds, 1000);
      setTimeout(removeAds, 3000);
      setInterval(removeAds, 5000);
    })();
  ` : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.topBar}>
          <AddressBar />
        </View>
        
        {currentUrl === 'about:blank' ? (
          <HomeScreen />
        ) : (
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
            userAgent={userAgent}
            injectedJavaScript={adBlockScript}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsBackForwardNavigationGestures={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            javaScriptCanOpenWindowsAutomatically={true}
            mixedContentMode="never"
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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

