// Copyright (c) 2025 SquareBrowser Contributors
//
// Expo config plugin: gives the Gradle daemon enough memory for release builds.
//
// The Expo template sets `-Xmx2048m -XX:MaxMetaspaceSize=512m`. A release build compiles
// native code for four CPU types and runs full R8 optimization (withR8Optimization.js), and
// ran out of Metaspace with those limits. `expo prebuild` regenerates gradle.properties, so
// the setting is re-applied on every prebuild. Needs about 8 GB of RAM on the build machine.
const { withGradleProperties } = require('@expo/config-plugins');

const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';

module.exports = (config) =>
  withGradleProperties(config, (cfg) => {
    const key = 'org.gradle.jvmargs';
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === key));
    cfg.modResults.push({ type: 'property', key, value: JVM_ARGS });
    return cfg;
  });
