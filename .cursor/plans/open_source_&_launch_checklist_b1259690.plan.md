---
name: Open Source & Launch Checklist
overview: Create comprehensive checklists for making OpenBrowser open source, Play Store ready, and Product Hunt submission ready. This includes documentation, licensing, code cleanup, store assets, and marketing materials.
todos: []
isProject: false
---

# Open

Browser: Open Source & Launch Preparation ChecklistThis plan provides comprehensive checklists to prepare OpenBrowser for open source release, Google Play Store publication, and Product Hunt submission.

## Overview

OpenBrowser is a React Native/Expo mobile browser app focused on accountability through permanent browsing history. The project needs:

1. **Open Source Preparation** - License, documentation, code cleanup
2. **Play Store Readiness** - Store listing, assets, compliance
3. **Product Hunt Preparation** - Marketing materials, launch strategy

## Implementation Plan

### Phase 1: Open Source Preparation

#### 1.1 License & Legal

- Choose and add open source license (recommend MIT for mobile apps)
- Create `LICENSE` file in root directory
- Add license badge to README
- Update `package.json` to remove `"private": true`
- Add license field to `package.json`
- Verify all dependencies have compatible licenses
- Add copyright notice in source files (optional but recommended)

#### 1.2 Documentation

- Create comprehensive `README.md` with:
- Project description and features
- Screenshots/GIFs of the app
- Installation instructions
- Development setup guide
- Contributing guidelines
- License information
- Links to Privacy Policy and Terms of Service
- Create `CONTRIBUTING.md` with:
- Code style guidelines
- Pull request process
- Issue reporting guidelines
- Create `CHANGELOG.md` to track version history
- Add code comments for complex logic
- Document environment variables or configuration needed

#### 1.3 Code Quality & Security

- Review and remove any hardcoded secrets/API keys
- Ensure `.gitignore` properly excludes:
- `node_modules/`
- Build artifacts
- Keystore files (`*.keystore`, `keystore.properties`)
- `local.properties`
- IDE files
- Add `.github/` directory structure:
- `ISSUE_TEMPLATE.md` for bug reports
- `ISSUE_TEMPLATE.md` for feature requests
- `PULL_REQUEST_TEMPLATE.md`
- Add security policy: `.github/SECURITY.md`
- Review dependencies for security vulnerabilities
- Add code of conduct: `CODE_OF_CONDUCT.md` (optional but recommended)

#### 1.4 Repository Setup

- Ensure repository is public on GitHub
- Add repository topics/tags (e.g., `react-native`, `browser`, `privacy`, `expo`)
- Create releases/tags for version 1.0.0
- Add repository description and website (if applicable)
- Set up GitHub Actions for CI/CD (optional but recommended)

### Phase 2: Google Play Store Preparation

#### 2.1 Store Listing Assets

- **App Icon**: 512x512px PNG (already have `assets/icon.png` - verify size)
- **Feature Graphic**: 1024x500px PNG (banner for Play Store)
- **Screenshots**: 
- Phone: At least 2, up to 8 (1080x1920px or similar)
- Tablet: Optional but recommended
- **Promo Video**: Optional YouTube video (30-120 seconds)
- **App Short Description**: 80 characters max
- **App Full Description**: 4000 characters max
- Include features, benefits, privacy focus
- Use proper formatting with line breaks

#### 2.2 App Information

- **App Name**: "OpenBrowser" (verify uniqueness)
- **Category**: Tools or Productivity
- **Content Rating**: Complete questionnaire
- **Privacy Policy URL**: 
- Host Privacy Policy online (GitHub Pages, website, or in-app)
- Update `app.json` if needed
- **Terms of Service URL**: Same as above
- **Support Email**: Create dedicated email or use existing
- **Website**: Optional but recommended

#### 2.3 Build & Signing

- Create production keystore (separate from debug)
- Store securely and backup
- Document keystore location and passwords securely
- Update `android/app/build.gradle` with release signing config
- Remove debug signing from release builds
- Build release AAB (Android App Bundle) for Play Store:

```bash
      cd android && ./gradlew bundleRelease
  

```

- Test release build thoroughly
- Update version code and version name in `app.json` and `build.gradle`

#### 2.4 Compliance & Policies

- Review Google Play Developer Policy
- Ensure app doesn't violate any policies
- Complete Data Safety section in Play Console:
- Data collection practices (you collect none - emphasize this)
- Data sharing (none)
- Security practices
- Prepare for target audience questions
- Review content rating requirements

#### 2.5 Testing

- Test on multiple Android devices/versions
- Test all core features (browsing, history, bookmarks, settings)
- Test dark mode functionality
- Test edge cases and error handling
- Performance testing
- Accessibility testing (optional but recommended)

### Phase 3: Product Hunt Preparation

#### 3.1 Product Hunt Listing

- **Product Name**: "OpenBrowser" or "OpenBrowser - Accountability Browser"
- **Tagline**: One-liner (60 characters max) describing the value proposition
- **Description**: 
- Clear, compelling description
- Highlight unique selling points (permanent history, privacy-focused, local-only)
- Use bullet points for readability
- **Topics**: Select relevant categories (Privacy, Productivity, Tools, etc.)
- **Gallery**: 
- High-quality screenshots (at least 3-5)
- Product demo video/GIF (optional but highly recommended)
- **Website URL**: Link to GitHub repo or dedicated website
- **Maker Comment**: Personal story about why you built this

#### 3.2 Marketing Assets

- Create Product Hunt thumbnail (1200x675px recommended)
- Prepare social media posts for launch day
- Create demo video (1-2 minutes showing key features)
- Prepare launch day timeline and strategy
- Identify potential hunters (if not self-hunting)

#### 3.3 Pre-Launch

- Set launch date (typically Tuesday-Thursday, 12:01 AM PST)
- Prepare email list or community for launch day support
- Create social media accounts (Twitter, etc.) if needed
- Write blog post about the project (optional but valuable)
- Reach out to potential early supporters

## Files to Create/Update

### New Files Needed:

1. `LICENSE` - Open source license file
2. `README.md` - Main project documentation
3. `CONTRIBUTING.md` - Contribution guidelines
4. `CHANGELOG.md` - Version history
5. `.github/ISSUE_TEMPLATE.md` - Issue templates
6. `.github/PULL_REQUEST_TEMPLATE.md` - PR template
7. `.github/SECURITY.md` - Security policy
8. `CODE_OF_CONDUCT.md` - Community guidelines (optional)

### Files to Update:

1. `package.json` - Remove `private: true`, add license field
2. `.gitignore` - Ensure all sensitive files are excluded
3. `app.json` - Verify all metadata is correct
4. `android/app/build.gradle` - Production signing configuration

## Recommended License: MIT

For a mobile browser app, **MIT License** is recommended because:

- Most permissive and widely used
- Easy for others to contribute
- Compatible with most dependencies
- Simple and well-understood
- Good for commercial use (if you want to allow it)

## Key Considerations

1. **Privacy Policy Hosting**: The Privacy Policy and Terms are currently in-app. For Play Store, you need publicly accessible URLs. Consider:

- GitHub Pages
- Simple website
- Or ensure in-app versions are accessible via deep links

1. **Keystore Security**: Production keystore must be:

- Backed up securely (multiple locations)
- Password protected
- Never committed to repository
- Documented in secure location

1. **Version Management**: Establish versioning strategy:

- Semantic versioning (e.g., 1.0.0)
- Update both `app.json` and `build.gradle` consistently

1. **Branding**: Ensure consistent branding across:

- App icon
- Store listings
- GitHub repository
- Product Hunt
- Social media

## Success Metrics

- Repository is public and well-documented
- App is approved and live on Play Store

