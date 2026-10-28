/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * JS wrapper for the SquareDownloads Android module: saves files into the public
 * Downloads folder. No-op (resolves null) where unavailable.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

const Native = Platform.OS === 'android' ? requireOptionalNativeModule('SquareDownloads') : null;

export const isDownloadSaveAvailable = Native != null;

// Android 9 and older write straight to the folder and need the storage permission.
const ensurePermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version >= 29) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/** Saves base64 data. Resolves to the saved file name; rejects when it cannot be saved. */
export const saveBase64ToDownloads = async (fileName, mimeType, base64) => {
  if (!Native) return null;
  if (!(await ensurePermission())) throw new Error('permission');
  return Native.saveBase64(fileName, mimeType || '', base64);
};

/** Saves text as UTF-8. Resolves to the saved file name; rejects when it cannot be saved. */
export const saveTextToDownloads = async (fileName, mimeType, text) => {
  if (!Native) return null;
  if (!(await ensurePermission())) throw new Error('permission');
  return Native.saveText(fileName, mimeType || 'text/plain', text);
};

const EXTENSIONS = {
  'application/pdf': 'pdf', 'application/json': 'json', 'application/zip': 'zip',
  'text/plain': 'txt', 'text/csv': 'csv', 'text/html': 'html', 'text/calendar': 'ics',
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3', 'video/mp4': 'mp4',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** The page's file name, or "download.<ext>" from the MIME type when the page gave none. */
export const fileNameFor = (name, mimeType) => {
  const trimmed = (name || '').trim();
  if (trimmed) return trimmed;
  const ext = EXTENSIONS[(mimeType || '').split(';')[0].trim().toLowerCase()];
  return ext ? `download.${ext}` : 'download';
};
