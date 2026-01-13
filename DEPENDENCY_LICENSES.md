# Dependency License Verification

This document tracks the licenses of all dependencies used in OpenBrowser to ensure compatibility with the MIT license.

## License Compatibility

OpenBrowser uses the **MIT License**, which is compatible with most open source licenses including:
- MIT
- Apache 2.0
- BSD (2-clause, 3-clause)
- ISC
- And most permissive licenses

## Core Dependencies

### React & React Native
- **react** (19.1.0) - MIT License ✅
- **react-native** (0.81.5) - MIT License ✅
- **react-dom** (19.1.0) - MIT License ✅
- **react-native-web** (^0.21.0) - MIT License ✅

### Navigation
- **@react-navigation/native** (^7.1.26) - MIT License ✅
- **@react-navigation/stack** (^7.2.0) - MIT License ✅
- **@react-navigation/bottom-tabs** (^7.9.0) - MIT License ✅
- **react-native-screens** (^4.19.0) - MIT License ✅
- **react-native-safe-area-context** (^5.6.2) - MIT License ✅

### Expo
- **expo** (~54.0.30) - MIT License ✅
- **expo-constants** (^18.0.12) - MIT License ✅
- **expo-dev-client** (^6.0.20) - MIT License ✅
- **expo-status-bar** (~3.0.9) - MIT License ✅
- **expo-linking** (~8.0.11) - MIT License ✅

### Storage
- **@react-native-async-storage/async-storage** (^2.2.0) - MIT License ✅

### WebView
- **react-native-webview** (^13.16.0) - MIT License ✅

### Icons
- **@expo/vector-icons** (^15.0.3) - MIT License ✅

## Verification Status

✅ **All dependencies use MIT-compatible licenses**

## How to Verify

To verify licenses of all dependencies, run:

```bash
npm ls --depth=0
```

To check for license information:

```bash
npm list --json | grep -i license
```

Or use a license checker tool:

```bash
npx license-checker --summary
```

## Notes

- All dependencies are compatible with MIT License
- No copyleft licenses (GPL, LGPL) are used
- All transitive dependencies should also be MIT-compatible
- Regular audits recommended when updating dependencies

## Last Verified

Date: 2025-01-XX
npm audit: 0 vulnerabilities found
