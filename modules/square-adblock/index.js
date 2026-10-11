/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * JS wrapper for the SquareAdBlock Android module, which filters WebView
 * sub-resource requests (scripts, images, iframes, XHR) before they download.
 * Every call is a no-op on platforms without the native module.
 */
import { Platform } from 'react-native';
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

/**
 * Installs the request filter on a react-native-webview. Pass the native view tag
 * (the `target` of any WebView event, e.g. onLoadStart); react-native-webview's ref is
 * an imperative handle, not a component, so findNodeHandle cannot resolve it.
 * Resolves true on success.
 */
export const attachToWebView = async (viewTag) => {
  if (!Native || typeof viewTag !== 'number') return false;
  try {
    return await Native.attach(viewTag);
  } catch (e) {
    return false;
  }
};

/** Number of domains loaded from the bundled list (0 until the background load finishes). */
export const getBundledCount = () => (Native ? Native.getBundledCount() : 0);
