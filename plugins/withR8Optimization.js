// Copyright (c) 2025 SquareBrowser Contributors
//
// Expo config plugin: turns on R8's full optimization for release builds.
//
// The Expo template minifies with `proguard-android.txt`, which disables R8 optimization,
// and leaves optimized resource shrinking off; Play Console flags both. `expo prebuild`
// regenerates android/, so both are re-applied on every prebuild:
//   - app/build.gradle uses `proguard-android-optimize.txt`
//   - gradle.properties sets `android.r8.optimizedResourceShrinking=true` (AGP 8.6+)
// Optimization inlines and removes code more aggressively, so anything reached by
// reflection needs a keep rule (see extraProguardRules in app.json). Smoke-test a release build.
const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const DEFAULT_RULES = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZE_RULES = 'getDefaultProguardFile("proguard-android-optimize.txt")';

const withOptimizeRules = (config) =>
  withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (gradle.includes(OPTIMIZE_RULES)) return cfg;
    if (!gradle.includes(DEFAULT_RULES)) {
      console.warn('withR8Optimization: proguard-android.txt not found in app/build.gradle; R8 optimization not enabled.');
      return cfg;
    }
    cfg.modResults.contents = gradle.replace(DEFAULT_RULES, OPTIMIZE_RULES);
    return cfg;
  });

const withOptimizedResourceShrinking = (config) =>
  withGradleProperties(config, (cfg) => {
    const key = 'android.r8.optimizedResourceShrinking';
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === key));
    cfg.modResults.push({ type: 'property', key, value: 'true' });
    return cfg;
  });

module.exports = (config) => withOptimizedResourceShrinking(withOptimizeRules(config));
