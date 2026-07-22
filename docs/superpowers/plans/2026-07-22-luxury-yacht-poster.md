# Luxury Yacht Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sea-fishing poster's small boat with a full luxury yacht while preserving centered typography and the existing URL.

**Architecture:** Replace only the source asset consumed by the existing feature-background compositor. Keep the centered theme layout and output filename unchanged.

**Tech Stack:** Python 3, Pillow, zxing-cpp, Node.js tests.

---

### Task 1: Replace and Regenerate

**Files:**
- Modify: `public/falcon-expo-assets/poster-sea-fishing-background.png`
- Modify: `public/falcon-expo-assets/salon-sea-fishing-theme-poster.png`
- Modify: `scripts/generate-salon-poster.py`
- Modify: `public/falcon-expo-assets/POSTER-CREDITS.md`

- [ ] Import the selected Unsplash luxury-yacht image as the sea-fishing background.
- [ ] Update source attribution and remove the previous boat credit.
- [ ] Regenerate all posters and confirm only the sea-fishing poster visual changes.
- [ ] Verify 1080×1920 RGB output, no barcode, centered text, and a visible complete yacht at 390×693.
- [ ] Run `npm test`, `node --check server.js`, and `git diff --check`.
- [ ] Commit, merge to `main`, push, and verify the Render file hash.
