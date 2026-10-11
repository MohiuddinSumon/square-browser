// Copyright (c) 2025 SquareBrowser Contributors
//
// Expo config plugin: signs Android release builds with the production keystore.
//
// `expo prebuild` regenerates android/ and resets build.gradle to debug signing, so the
// signing config is re-applied on every prebuild. Credentials come from
// `keystore.properties` in the project root (git-ignored), or from the file named by
// the SQUARE_KEYSTORE_PROPERTIES environment variable. Keys: storeFile, storePassword,
// keyAlias, keyPassword. A relative storeFile is resolved against the properties file.
const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// squarebrowser-release-signing';

const LOADER = `${MARKER}
def squareKeystoreFile = new File(System.getenv('SQUARE_KEYSTORE_PROPERTIES') ?: "\${rootProject.projectDir.parentFile}/keystore.properties")
def squareKeystoreProps = new Properties()
if (squareKeystoreFile.exists()) {
    squareKeystoreFile.withInputStream { squareKeystoreProps.load(it) }
} else {
    logger.warn("WARNING: \${squareKeystoreFile} not found - release builds will be signed with the DEBUG key and cannot be published.")
}

`;

const RELEASE_CONFIG = `
        release {
            if (squareKeystoreProps.getProperty('storeFile')) {
                storeFile new File(squareKeystoreFile.parentFile, squareKeystoreProps.getProperty('storeFile'))
                storePassword squareKeystoreProps.getProperty('storePassword')
                keyAlias squareKeystoreProps.getProperty('keyAlias')
                keyPassword squareKeystoreProps.getProperty('keyPassword')
            }
        }`;

const patchBuildGradle = (src) => {
  if (src.includes(MARKER)) return src;

  // 1. Credentials loader just before the android { } block.
  let out = src.replace(/^android \{/m, (m) => LOADER + m);

  // 2. A `release` signing config after the existing `debug` one.
  out = out.replace(/(signingConfigs \{\s*debug \{[\s\S]*?\n        \})/, `$1${RELEASE_CONFIG}`);

  // 3. Use it for the release build type (falls back to debug if no credentials).
  out = out.replace(
    /(release \{\s*\/\/ Caution![\s\S]*?\n\s*)signingConfig signingConfigs\.debug/,
    `$1signingConfig squareKeystoreProps.getProperty('storeFile') ? signingConfigs.release : signingConfigs.debug`
  );

  if (!out.includes('signingConfigs.release') || !out.includes('def squareKeystoreFile')) {
    throw new Error('withReleaseSigning: build.gradle layout not recognised; update the plugin.');
  }
  return out;
};

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });

module.exports = withReleaseSigning;
module.exports.patchBuildGradle = patchBuildGradle;
