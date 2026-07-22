# Baijiu Tasting Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a refined three-cup baijiu tasting scene to the existing Moutai poster.

**Architecture:** Add a reusable optional poster decoration callback to the Pillow compositor. Implement the baijiu cups as a dedicated raster decoration and enable it only for the Moutai theme.

**Tech Stack:** Python 3, Pillow, zxing-cpp, Node.js tests.

---

### Task 1: Add Tasting Scene Decoration

**Files:**
- Modify: `scripts/generate-salon-poster.py`
- Modify: `public/falcon-expo-assets/salon-moutai-theme-poster.png`

- [ ] Add an optional decoration callback to `make_theme_poster`.
- [ ] Draw a lacquer tray, three porcelain tasting cups, clear liquid, highlights, and soft shadows.
- [ ] Enable the decoration only for the Moutai poster and regenerate all outputs.
- [ ] Inspect 1080×1920 and 390×693 results and verify no barcode.
- [ ] Run `npm test`, `node --check server.js`, and `git diff --check`.
- [ ] Commit, merge, push, and verify the deployed Moutai poster hash.
