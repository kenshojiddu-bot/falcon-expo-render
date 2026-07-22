# Salon Poster Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one concise registration poster with QR and three visually coordinated theme posters without QR for Moutai tasting, sea fishing, and global expansion.

**Architecture:** Extend the existing deterministic Pillow poster generator to produce all four 1080×1920 PNGs. Use the existing falcon photograph for registration/global posters, and commit two generated photorealistic background assets for the Moutai and sea-fishing posters. Keep QR generation isolated to the registration poster and verify the final files with an independent decoder.

**Tech Stack:** Python 3, Pillow, Python `qrcode`, `zxing-cpp`, built-in image generation, Node.js test runner.

---

## File Map

- Modify `scripts/generate-salon-poster.py`: generate four coordinated posters.
- Modify `public/falcon-expo-assets/oriental-falcon-salon-poster.png`: shorten the registration-poster flow.
- Create `public/falcon-expo-assets/poster-moutai-background.png`: generated unlabeled tasting scene.
- Create `public/falcon-expo-assets/poster-sea-fishing-background.png`: generated offshore fishing scene.
- Create `public/falcon-expo-assets/salon-moutai-theme-poster.png`.
- Create `public/falcon-expo-assets/salon-sea-fishing-theme-poster.png`.
- Create `public/falcon-expo-assets/salon-global-theme-poster.png`.

### Task 1: Simplify the Registration Poster

- [ ] Replace the long agenda copy with four prominent nodes: `东方文化体验`, `AI+文旅出海沙龙`, `精品晚宴`, `东方节目与互动`.
- [ ] Retain the date, times, hotel, address, and right-bottom QR.
- [ ] Regenerate the 1080×1920 PNG and verify the QR decodes to `https://falcon-expo.onrender.com/salon.html`.
- [ ] Check a 390×693 preview for readable title, event information, and flow.

### Task 2: Generate Theme Backgrounds

- [ ] Generate a 9:16 photorealistic Moutai-tasting atmosphere with an amber spirit glass, refined Eastern banquet setting, copper-gold/vermilion palette, upper-left negative space, no text, no logo, and no readable bottle label.
- [ ] Generate a 9:16 photorealistic offshore fishing scene at sunrise with an angler, rod, open sea, deep-blue/gold palette, upper-left negative space, no text, and no logo.
- [ ] Save the selected backgrounds under `public/falcon-expo-assets/` and inspect them before composition.

### Task 3: Compose Three QR-Free Theme Posters

- [ ] Generate the Moutai poster with `精品东方 · 醇香世界` and `精品茅台高端品鉴之夜`.
- [ ] Generate the sea-fishing poster with `向海而行 · 钓见新境` and `海钓文化 · 户外生活 · 圈层社交`.
- [ ] Generate the global poster with `鹰耀中东 · 链接全球` and `沙特猎鹰展推介 · AI+文旅出海`.
- [ ] Add the shared footer `2026.8.7 · 成都` and `精品东方·鹰耀出海` to each companion poster.
- [ ] Do not draw or paste a QR code on any companion poster.

### Task 4: Verify, Commit, and Deploy

- [ ] Assert all four posters are RGB PNGs at 1080×1920.
- [ ] Decode the registration poster QR to the exact live URL.
- [ ] Assert the independent decoder finds no barcode in the three companion posters.
- [ ] Inspect full-resolution and 390×693 previews for all four posters.
- [ ] Run `npm test`, `node --check server.js`, and `git diff --check`.
- [ ] Commit, merge into `main`, push GitHub, and verify all four Render asset URLs return the deployed PNGs.
