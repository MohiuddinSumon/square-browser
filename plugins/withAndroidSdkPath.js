// Copyright (c) 2025 SquareBrowser Contributors
//
// Expo config plugin: writes android/local.properties (sdk.dir) on every prebuild.
//
// `expo prebuild --clean` deletes android/, including local.properties, and Gradle then
// fails with "SDK location not found" unless ANDROID_HOME is set. The SDK path comes from
// ANDROID_HOME / ANDROID_SDK_ROOT, falling back to the default Android Studio location.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const os = require('os');
const path = require('path');

const findSdk = () => {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
  ];
  return candidates.find((p) => p && fs.existsSync(path.join(p, 'platform-tools')) || p && fs.existsSync(path.join(p, 'build-tools')));
};

const withAndroidSdkPath = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const sdk = findSdk();
      if (!sdk) {
        console.warn('withAndroidSdkPath: Android SDK not found; set ANDROID_HOME or create android/local.properties by hand.');
        return cfg;
      }
      // Properties files treat backslashes as escapes, so use forward slashes.
      const line = `sdk.dir=${sdk.replace(/\\/g, '/')}\n`;
      fs.writeFileSync(path.join(cfg.modRequest.platformProjectRoot, 'local.properties'), line);
      return cfg;
    },
  ]);

module.exports = withAndroidSdkPath;
