# Changelog

All notable changes to SquareBrowser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Native ad, pop-under and tracker blocking with a bundled offline domain list.
- Background audio playback with a media notification.
- Fullscreen video with landscape rotation and a rotate button.
- Open-in-app prompt for external app links.
- Refreshed interface with a dark-mode status bar and slimmer navigation bar.
- Back gesture closes Settings.
- Smoother tab switcher animation.
- Language setting with Russian, Polish and German (English stays the default).
- One shared screen header, so every page has the same spacing and design.
- Search engine choice: Google, DuckDuckGo, Bing or Brave Search.
- Dark Web Pages: shows bright websites in dark colors.
- Text Size setting for web pages (Android).
- Downloads that a page creates itself (generated PDFs, tickets, exports) are now saved to Downloads; downloads also work on Android 8 and 9.
- Bengali (বাংলা) translation.
- Schedules: pause browsing at set times (study, sleep, prayer).
- Commitment lock: weakening your limits waits 24 hours or needs a PIN a friend keeps.
- Block list for sites you want to avoid, an optional adult-site filter, and forced SafeSearch.
- Export history (CSV or web page) and bookmarks; import bookmarks from any browser.
- Weekly summary you can send to an accountability partner (no servers involved).

### Changed
- Moved project documentation into the `docs/` directory.

### Fixed
- Resolved bottom navigation overflow.
- Fixed the new tab bottom overlay issue.
- Fixed login errors on sites with strict bot protection (such as OLX) when Enhanced Compatibility is on.
- Fixed pages that could no longer scroll after a full-screen pop-up ad was blocked.
- Fixed the Products page layout and headers sitting under the status bar or camera on History, Bookmarks and Products.

### Planned
- iOS support
- Enhanced ad blocking
- Reading mode

## [1.0.2] - 2025-01-XX

### Added
- Time limit feature.

### Changed
- Website landing page and marketing assets.

## [1.0.0] - 2025-01-XX

### Added
- Initial release of SquareBrowser
- Privacy-focused mobile browser with permanent history tracking
- Local-only data storage (no external servers)
- Tab management with multiple tabs support
- Bookmarks functionality
- Usage statistics tracking
- Dark mode support
- Desktop mode toggle
- Basic ad blocking
- Settings screen with theme and exit confirmation options
- Privacy Policy and Terms of Service screens
- Android support

### Features
- **Privacy**: All data stored locally on device
- **Accountability**: Permanent browsing history (cannot be deleted)
- **No Tracking**: No analytics, telemetry, or data collection
- **Open Source**: Full source code available

[Unreleased]: https://github.com/MohiuddinSumon/square-browser/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/MohiuddinSumon/square-browser/releases/tag/v1.0.2
[1.0.0]: https://github.com/MohiuddinSumon/square-browser/releases/tag/v1.0.0
