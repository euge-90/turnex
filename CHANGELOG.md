# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-09-20
### Added
- QR generator in App Download section:
  - Inline SVG placeholder to avoid empty box.
  - Runtime QR generation via `qrcodejs` (CDN) using `data-qr` target.
- Service cards: consistent layout (flex), description line-clamp, and staggered reveal animation on render.
- Category UI: 3D tilt + sheen + parallax, scroll arrows, animated counters.

### Changed
- Auth modal: improved signup UX, toggled required fields in signup mode, clearer error messages (network/CORS handling).
- CSS polish for dark mode in multiple components (including QR mock).
- Service Worker cache busting and safer caching to ensure users see updates.

### Fixed
- Visibility issues due to caching: cache-busting query params and SW version bump.
- Card misalignment across breakpoints.

## [1.0.0] - 2025-09-18
- Initial release: SPA, calendar, services, bookings, auth, basic styles.

## [dev] - 2025-09-26
### Changed
- Make Prisma migrations tolerant: add existence checks to user-altering migration SQL to avoid hard failures when migrations are applied out-of-order or when the `User` table is not present during a run.
