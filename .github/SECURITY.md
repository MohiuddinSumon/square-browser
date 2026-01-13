# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of OpenBrowser seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do the following:

1. **Do not** open a public GitHub issue
2. Email security concerns to: [security@example.com] (or create a GitHub security advisory at https://github.com/MohiuddinSumon/open-browser/security/advisories/new)
3. Include the following information:
   - Type of vulnerability
   - Full paths of source file(s) related to the vulnerability
   - The location of the affected code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit the issue

### What to expect:

- You will receive a response within 48 hours
- We will work with you to understand and resolve the issue quickly
- We will keep you informed of the progress toward resolution
- We will credit you for the discovery (if you wish)

### Security Best Practices

OpenBrowser is designed with privacy and security in mind:

- **No External Data Transmission**: All data is stored locally on the device
- **No Tracking**: No analytics, telemetry, or user tracking
- **Open Source**: Full source code is available for security audits
- **Regular Updates**: We keep dependencies up to date to address known vulnerabilities

### Known Security Considerations

- OpenBrowser uses `react-native-webview` which inherits the security characteristics of the underlying WebView component
- Users should be aware that browsing history is stored permanently on the device
- The app requires internet permission to function as a browser

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the issue and determine affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all releases still under support
4. Release fixes as quickly as possible

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1, 1.0.2) and will be clearly marked in the [CHANGELOG.md](../CHANGELOG.md).

Thank you for helping keep OpenBrowser and our users safe!
