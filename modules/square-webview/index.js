/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * SquareBrowser's own Android WebView component (phase 1 of replacing react-native-webview
 * on Android). It takes the subset of react-native-webview props BrowserTab uses and fires
 * events with the same shapes, so BrowserTab can switch engines with one flag:
 *
 *   source={{ uri }}, userAgent,
 *   injectedJavaScriptBeforeContentLoaded  -> runs at document start (main frame)
 *   injectedJavaScript                     -> runs when the page finishes loading (main frame)
 *   onLoadStart / onLoadProgress / onLoadEnd / onNavigationStateChange / onMessage
 *   onExternalUrl({ nativeEvent: { url, web } }) for app links: whatsapp:, intent:, market: ...
 *     and (web: true) Play Store / WhatsApp web links. The page is NOT loaded; call
 *     ref.loadUrl(url) to load it anyway ("Stay in browser").
 *   onOpenWindow({ nativeEvent: { targetUrl, userGesture } }) for window.open / target="_blank"
 *   blockedHosts: domains whose pages a tapped link may not open (suffix match)
 *
 * Ref methods: reload, goBack, goForward, stopLoading, injectJavaScript(js), loadUrl(url).
 * Other react-native-webview props are ignored; the native side applies the settings
 * BrowserTab used to pass (see BrowserWebView.kt).
 */
import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule, requireNativeView } from 'expo';

const nativeModule = Platform.OS === 'android' ? requireOptionalNativeModule('SquareWebView') : null;
const NativeView = nativeModule ? requireNativeView('SquareWebView') : null;

/** True when this build includes the native engine (Android dev/release builds after prebuild). */
export const isNativeWebViewAvailable = NativeView != null;

const NO_HOSTS = [];

export const SquareWebView = forwardRef(function SquareWebView(
  {
    source,
    userAgent,
    injectedJavaScriptBeforeContentLoaded,
    injectedJavaScript,
    style,
    onLoadStart,
    onLoadProgress,
    onLoadEnd,
    onNavigationStateChange,
    onMessage,
    onExternalUrl,
    onOpenWindow,
    blockedHosts,
  },
  ref
) {
  if (!NativeView) return null;
  return (
    <NativeView
      ref={ref}
      style={style}
      sourceUri={source?.uri ?? null}
      userAgent={userAgent ?? null}
      documentStartScript={injectedJavaScriptBeforeContentLoaded || ''}
      documentEndScript={injectedJavaScript || ''}
      onLoadStart={onLoadStart}
      onLoadProgress={onLoadProgress}
      onLoadEnd={onLoadEnd}
      // react-native-webview passes the bare state object here, not a { nativeEvent } event.
      onNavigationStateChange={onNavigationStateChange && ((e) => onNavigationStateChange(e.nativeEvent))}
      onMessage={onMessage}
      onExternalUrl={onExternalUrl}
      onOpenWindow={onOpenWindow}
      blockedHosts={blockedHosts || NO_HOSTS}
    />
  );
});
