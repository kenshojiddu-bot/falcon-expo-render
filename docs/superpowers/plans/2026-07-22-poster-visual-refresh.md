# Poster Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the four salon posters with distinct backgrounds, a visible offshore fishing boat, centered companion-poster typography, and theme-specific colors.

**Architecture:** Continue using the deterministic Pillow generator and existing output filenames. Add a licensed boat-at-sea source image, change registration and theme source assignments, and extend the theme compositor with centered text plus separate color washes.

**Tech Stack:** Python 3, Pillow, qrcode, zxing-cpp, Node.js tests.

---

### Task 1: Replace Visual Sources

**Files:**
- Create: `public/falcon-expo-assets/poster-sea-fishing-background.png`
- Modify: `scripts/generate-salon-poster.py`

- [ ] Select and download a licensed offshore fishing image where the boat hull remains visible in a 9:16 crop.
- [ ] Use `salon-expo.jpg` for the registration poster and keep `hero-falcon.jpg` for the global theme poster.
- [ ] Record the sea image source URL in the generator.

### Task 2: Center Companion Layouts and Separate Colors

**Files:**
- Modify: `scripts/generate-salon-poster.py`
- Modify: `public/falcon-expo-assets/salon-moutai-theme-poster.png`
- Modify: `public/falcon-expo-assets/salon-sea-fishing-theme-poster.png`
- Modify: `public/falcon-expo-assets/salon-global-theme-poster.png`

- [ ] Add a configurable color wash to the shared theme poster compositor.
- [ ] Draw series name, two-line title, subtitle, divider, date, activity name, and footer label centered on the canvas.
- [ ] Configure Moutai as red/gold, sea fishing as blue/white, and global expansion as Saudi green/gold.
- [ ] Regenerate all three QR-free posters.

### Task 3: Refresh Registration Poster

**Files:**
- Modify: `public/falcon-expo-assets/oriental-falcon-salon-poster.png`
- Modify: `scripts/generate-salon-poster.py`

- [ ] Crop the expo scene as the registration background with enough contrast behind all copy.
- [ ] Retain the event overview, date, times, hotel, address, four flow nodes, and right-bottom QR.
- [ ] Regenerate the registration poster without changing the live URL.

### Task 4: Verify and Deploy

**Files:**
- Verify: `public/falcon-expo-assets/*.png`

- [ ] Assert all four posters are RGB 1080×1920 PNG files.
- [ ] Decode only the registration poster to the exact live URL and detect no barcode in companion posters.
- [ ] Inspect all four at full size and 390×693, confirming visible boat hull and centered companion text.
- [ ] Run `npm test`, `node --check server.js`, and `git diff --check`.
- [ ] Commit, merge to `main`, push GitHub, and verify all four Render URLs match local files.
