# Baijiu Poster Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the whiskey-style Moutai poster background with an unmistakable sauce-aroma baijiu visual.

**Architecture:** Replace only the Moutai source asset and its attribution. Reuse the existing centered red-and-gold theme compositor and output filename.

**Tech Stack:** Python 3, Pillow, zxing-cpp, Node.js tests.

---

### Task 1: Correct the Moutai Visual

**Files:**
- Modify: `public/falcon-expo-assets/poster-moutai-background.png`
- Modify: `public/falcon-expo-assets/salon-moutai-theme-poster.png`
- Modify: `scripts/generate-salon-poster.py`
- Modify: `public/falcon-expo-assets/POSTER-CREDITS.md`

- [ ] Import the selected Moutai baijiu bottle image and update attribution.
- [ ] Regenerate the poster with centered red-and-gold typography.
- [ ] Inspect full-size and 390×693 output for baijiu recognition and text alignment.
- [ ] Verify RGB 1080×1920 output and no barcode.
- [ ] Run `npm test`, `node --check server.js`, and `git diff --check`.
- [ ] Commit, merge, push, and verify the deployed file hash.
