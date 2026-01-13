# Contributing to OpenBrowser

Thank you for your interest in contributing to OpenBrowser! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check if the issue has already been reported in [GitHub Issues](https://github.com/MohiuddinSumon/open-browser/issues)
2. Check if the issue has been fixed in a recent update

When creating a bug report, please include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Device/OS information (Android version, device model)
- App version

Use the [Bug Report template](.github/ISSUE_TEMPLATE.md) when creating an issue.

### Suggesting Features

We welcome feature suggestions! When suggesting a feature:
1. Check if the feature has already been suggested
2. Explain the problem the feature would solve
3. Describe your proposed solution
4. Consider alternative solutions

Use the [Feature Request template](.github/ISSUE_TEMPLATE.md) when creating an issue.

### Pull Requests

1. **Fork the repository** and create your branch from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following our coding standards (see below)

3. **Test your changes**:
   - Test on Android devices/emulators
   - Ensure the app builds successfully
   - Test all affected features

4. **Commit your changes**:
   ```bash
   git commit -m "Add amazing feature"
   ```
   - Write clear, descriptive commit messages
   - Reference issue numbers if applicable

5. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**:
   - Use a clear, descriptive title
   - Describe what changes you made and why
   - Reference any related issues
   - Include screenshots for UI changes

## Coding Standards

### JavaScript/React Native

- Use **ES6+** syntax
- Follow **React Hooks** best practices
- Use **functional components** (avoid class components)
- Use **const** and **let** (avoid **var**)
- Use **arrow functions** for callbacks
- Use **async/await** instead of promises where possible

### Code Style

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Use **semicolons** at the end of statements
- Maximum line length: **100 characters**
- Use **camelCase** for variables and functions
- Use **PascalCase** for components

### File Naming

- Components: `PascalCase.js` (e.g., `BrowserScreen.js`)
- Utilities: `camelCase.js` (e.g., `storage.js`)
- Constants: `UPPER_SNAKE_CASE.js` (if needed)

### Component Structure

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MyComponent = ({ prop1, prop2 }) => {
  // Hooks
  // State
  // Effects
  // Callbacks
  // Render
  return (
    <View style={styles.container}>
      <Text>Content</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MyComponent;
```

### Comments

- Write clear, concise comments
- Explain **why**, not **what**
- Use JSDoc for function documentation:
  ```javascript
  /**
   * Adds a history entry to local storage
   * @param {string} url - The URL to add
   * @param {string} title - The page title
   * @returns {Promise<boolean>} Success status
   */
  ```

## Testing

Before submitting a PR:
- [ ] Test on Android (multiple versions if possible)
- [ ] Test all affected features
- [ ] Ensure no console errors or warnings
- [ ] Test both light and dark modes
- [ ] Verify the app builds successfully

## Commit Messages

Write clear, descriptive commit messages:

**Good:**
```
Add dark mode toggle to settings screen
Fix history not saving when navigating quickly
Update dependencies to latest versions
```

**Bad:**
```
fix
update
changes
```

## Review Process

1. All PRs require at least one maintainer review
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR

## Questions?

If you have questions about contributing:
- Open a [GitHub Discussion](https://github.com/MohiuddinSumon/open-browser/discussions)
- Check existing issues and discussions
- Review the codebase to understand patterns

Thank you for contributing to OpenBrowser! 🎉
