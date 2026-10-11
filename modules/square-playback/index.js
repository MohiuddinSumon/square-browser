/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * JS wrapper for the SquarePlayback Android module: a foreground service plus media
 * notification that keeps audio playing in the background and exposes
 * previous / play-pause / next. No-op where unavailable.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

const Native = Platform.OS === 'android' ? requireOptionalNativeModule('SquarePlayback') : null;

export const isBackgroundPlaybackAvailable = Native != null;

/** info: { playing, title, artist, artwork, hasPrev, hasNext, seek } */
export const updatePlayback = (info) =>
  Native
    ? Native.update(
        !!info.playing,
        info.title || '',
        info.artist || '',
        info.artwork || '',
        !!info.hasPrev,
        !!info.hasNext,
        !!info.seek
      )
    : false;

export const stopPlaybackService = () => {
  if (Native) Native.stop();
};

/** Subscribes to notification / headset button presses: 'play' | 'pause' | 'next' | 'previous'. */
export const addMediaActionListener = (callback) => {
  if (!Native) return () => {};
  const sub = Native.addListener('onMediaAction', (e) => callback(e.action));
  return () => sub.remove();
};

/**
 * Runs JS in a react-native-webview given its native view tag (the `target` of any
 * WebView event). Unlike ref.injectJavaScript this still works while the app is in the
 * background, when React Native's UI command queue is stalled.
 */
export const evaluateInWebView = (viewTag, js) => {
  if (!Native || typeof viewTag !== 'number') return false;
  Native.evaluate(viewTag, js).catch(() => {});
  return true;
};
