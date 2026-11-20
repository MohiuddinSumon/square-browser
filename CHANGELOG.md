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
- Pull to refresh on Android (can be turned off in Settings).
- Close All button in the tab switcher.
- SquareBrowser's own web engine on Android, now the default: its built-in scripts (ad blocking, background playback) reliably run before the page's own scripts, link and popup decisions are made instantly, file uploads, downloads to the Downloads folder, and recovery when a page's renderer crashes. Settings > Classic Web Engine switches back if a site misbehaves.
- `release.bat` collects each build in `release/v<version>-<code>/`.

### Changed
- Moved project documentation into the `docs/` directory.

### Fixed
- Resolved bottom navigation overflow.
- Fixed the new tab bottom overlay issue.
- Fixed login errors on sites with strict bot protection (such as OLX) when Enhanced Compatibility is on.
- Fixed pages that could no longer scroll after a full-screen pop-up ad was blocked.
- Fixed the Products page layout and headers sitting under the status bar or camera on History, Bookmarks and Products.
- WhatsApp, Play Store and other app buttons on websites now open their apps (they silently did nothing on Android 11+).

### Planned
- iOS support
- Enhanced ad blocking
- Custom search engines
- Export/import bookmarks
- Reading mode
- Download manager

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
