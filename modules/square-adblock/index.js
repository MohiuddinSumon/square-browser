/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * JS wrapper for the SquareAdBlock Android module, which filters WebView
 * sub-resource requests (scripts, images, iframes, XHR) before they download.
 * Every call is a no-op on platforms without the native module.
 */
import { Platform, findNodeHandle } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

const Native = Platform.OS === 'android' ? requireOptionalNativeModule('SquareAdBlock') : null;

export const isNativeAdBlockAvailable = Native != null;

export const setBlockedDomains = (domains) => {
  if (Native) Native.setDomains(domains);
};

export const setNativeAdBlockEnabled = (enabled) => {
  if (Native) Native.setEnabled(!!enabled);
};

export const getBlockedCount = () => (Native ? Native.getBlockedCount() : 0);

export const resetBlockedCount = () => {
  if (Native) Native.resetBlockedCount();
};

/** Installs the request filter on a react-native-webview ref. Resolves true on success. */
export const attachToWebView = async (webViewRef) => {
  if (!Native || !webViewRef) return false;
  try {
    const tag = findNodeHandle(webViewRef);
    if (tag == null) return false;
    return await Native.attach(tag);
  } catch (e) {
    return false;
  }
};
