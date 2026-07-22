# Oriental Falcon Salon Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the salon overview with the approved Saudi falcon expo introduction and create a verified 1080×1920 registration poster whose QR code opens the live salon form.

**Architecture:** Keep the production page static and update only its approved overview copy. Generate the QR and poster as deterministic PNG assets from the existing falcon photograph, using Pillow for composition and the maintained Python `qrcode` package for standards-compliant encoding. Verify page behavior with the existing Node tests, poster geometry with Pillow, and QR readability with an independent decoder.

**Tech Stack:** Static HTML/CSS, Node.js test runner, Python 3, Pillow, Python `qrcode`, Chromium `BarcodeDetector` or `zxing-cpp` for independent QR decoding.

---

## File Map

- Modify `public/salon.html`: replace only the activity overview paragraph.
- Modify `tests/salon-page.test.mjs`: assert the approved overview copy and ensure the agenda is unchanged.
- Create `public/falcon-expo-assets/salon-registration-qr.png`: high-contrast QR code for the live registration URL.
- Create `public/falcon-expo-assets/oriental-falcon-salon-poster.png`: final 1080×1920 poster.
- Create `scripts/generate-salon-poster.py`: deterministic poster and QR generator.

### Task 1: Update the Salon Theme Introduction

**Files:**
- Modify: `tests/salon-page.test.mjs`
- Modify: `public/salon.html`

- [ ] **Step 1: Add a failing overview-copy test**

Add an assertion scoped to the “活动概述” section:

```js
test('salon overview introduces the Saudi falcon expo theme', () => {
  const overview = findSectionByHeading(html, '活动概述');
  assertVisibleTextIncludesAll(overview, [
    '活动以“精品东方·鹰耀出海”为主题',
    '沙特猎鹰展推介',
    'AI+文旅出海',
    '东方精品文化交流',
    '出海企业家、海外嘉宾、AI科技企业代表及高净值客户'
  ], 'salon overview');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/salon-page.test.mjs`

Expected: FAIL because the existing activity overview does not mention “沙特猎鹰展推介”.

- [ ] **Step 3: Replace the overview paragraph**

Use this exact visible text in `public/salon.html`:

```html
<p>活动以“精品东方·鹰耀出海”为主题，围绕沙特猎鹰展推介、AI+文旅出海与东方精品文化交流展开，链接出海企业家、海外嘉宾、AI科技企业代表及高净值客户。</p>
```

Do not add “沙特猎鹰展推介” to either agenda list.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests PASS and the existing afternoon/dinner tests remain unchanged.

- [ ] **Step 5: Commit the page update**

```bash
git add public/salon.html tests/salon-page.test.mjs
git commit -m "feat: add falcon expo theme to salon overview"
```

### Task 2: Generate the QR Code and Poster

**Files:**
- Create: `scripts/generate-salon-poster.py`
- Create: `public/falcon-expo-assets/salon-registration-qr.png`
- Create: `public/falcon-expo-assets/oriental-falcon-salon-poster.png`
- Read: `public/falcon-expo-assets/hero-falcon.jpg`

- [ ] **Step 1: Install the generation-only QR dependency outside the application dependency graph**

```bash
python3 -m pip install --target tmp/poster-deps "qrcode[pil]==8.2"
```

The dependency stays under ignored `tmp/`; Render and the website do not depend on it.

- [ ] **Step 2: Create the deterministic generator**

Implement `scripts/generate-salon-poster.py` with these constants:

```python
WIDTH, HEIGHT = 1080, 1920
REGISTRATION_URL = "https://falcon-expo.onrender.com/salon.html"
SOURCE_IMAGE = Path("public/falcon-expo-assets/hero-falcon.jpg")
QR_OUTPUT = Path("public/falcon-expo-assets/salon-registration-qr.png")
POSTER_OUTPUT = Path("public/falcon-expo-assets/oriental-falcon-salon-poster.png")
FONT_PATH = "/System/Library/Fonts/PingFang.ttc"
```

The generator must:

1. Create a QR code with error correction Q, black modules, white background, and at least four modules of quiet zone.
2. Crop `hero-falcon.jpg` to fill 1080×1920 while retaining the falcon eye and head.
3. Apply a charcoal vertical overlay for readable white and copper text.
4. Draw the exact title, approved overview, date/time, hotel/address, and “扫码报名”.
5. Place the QR in an opaque white panel at least 300×300 pixels near the bottom.
6. Draw `falcon-expo.onrender.com/salon.html` below the QR.
7. Save an RGB PNG at exactly 1080×1920.

Use measured text wrapping based on `ImageDraw.textbbox`; do not split Chinese copy by arbitrary character counts.

- [ ] **Step 3: Generate the assets**

```bash
PYTHONPATH=tmp/poster-deps python3 scripts/generate-salon-poster.py
```

Expected: both PNG files are created without modifying application dependencies.

- [ ] **Step 4: Verify dimensions and QR decoding**

Verify image geometry:

```bash
python3 - <<'PY'
from PIL import Image
poster = Image.open('public/falcon-expo-assets/oriental-falcon-salon-poster.png')
qr = Image.open('public/falcon-expo-assets/salon-registration-qr.png')
assert poster.size == (1080, 1920)
assert qr.width == qr.height and qr.width >= 300
print(poster.size, qr.size)
PY
```

Decode `salon-registration-qr.png` with Chromium `BarcodeDetector` or an independently installed `zxing-cpp` decoder. The decoded value must equal exactly:

```text
https://falcon-expo.onrender.com/salon.html
```

- [ ] **Step 5: Visually inspect the poster**

Check the full-resolution PNG and a phone-size preview. Confirm:

- title, overview, date, times, venue and address are unobstructed;
- the falcon remains the primary visual;
- QR quiet zone remains fully white;
- no text touches the canvas edge;
- no unprovided logo or registration number appears.

- [ ] **Step 6: Commit the poster assets**

```bash
git add scripts/generate-salon-poster.py \
  public/falcon-expo-assets/salon-registration-qr.png \
  public/falcon-expo-assets/oriental-falcon-salon-poster.png
git commit -m "feat: add oriental falcon salon registration poster"
```

### Task 3: Final Verification and Deployment

**Files:**
- Verify: `public/salon.html`
- Verify: `public/falcon-expo-assets/oriental-falcon-salon-poster.png`

- [ ] **Step 1: Run all automated checks**

```bash
npm test
node --check server.js
git diff --check
```

Expected: every test passes and no syntax or whitespace errors are reported.

- [ ] **Step 2: Verify the live URL is encoded in the committed QR**

Decode the committed QR again after any image optimization. Expected exact result:

```text
https://falcon-expo.onrender.com/salon.html
```

- [ ] **Step 3: Push main and verify Render**

```bash
git push origin main
```

Verify that `https://falcon-expo.onrender.com/salon.html` contains “沙特猎鹰展推介” and that the registration form still submits successfully.
