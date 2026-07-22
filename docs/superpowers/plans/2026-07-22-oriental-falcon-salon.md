# Oriental Falcon Salon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic outbound salon page with the mobile-first “精品东方·鹰耀出海” event page, preserve Neon-backed registration, and add a success completion button that returns to the falcon expo homepage without displaying a registration number.

**Architecture:** Keep the existing Express endpoint and `salon_registrations` table unchanged. Rebuild `public/salon.html` around the confirmed activity information and reuse the existing falcon visual system, adding one real expo photo extracted from the latest Chinese handbook. Registration remains a static-page POST to `/api/salon-registrations`; successful online submissions transition to an in-page completion state.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Express 4, Neon PostgreSQL, Render Web Service.

---

## File Map

- Create `tests/salon-page.test.mjs`: event content, stale-content, form, and completion-state assertions.
- Create `public/falcon-expo-assets/salon-expo.jpg`: real falcon expo crowd image extracted from the current Chinese handbook.
- Modify `public/salon.html`: event visual design, confirmed agenda, audience, registration options, and completion flow.
- Keep `server.js` unchanged: existing `/api/salon-registrations` contract already supports the required fields.

### Task 1: Define the New Salon Page Contract

**Files:**
- Create: `tests/salon-page.test.mjs`
- Test: `public/salon.html`

- [ ] **Step 1: Write failing content tests**

Create `tests/salon-page.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/salon.html', import.meta.url), 'utf8');

test('salon page contains the confirmed event identity and schedule', () => {
  for (const value of [
    '精品东方·鹰耀出海', '2026年8月7日', '15:00', '18:00',
    '成都高新区豪生酒店', '武侯区天泰路338号', '定向邀约100余位'
  ]) assert.ok(html.includes(value), `missing ${value}`);
});

test('salon page contains the complete afternoon and dinner programs', () => {
  for (const value of [
    '茅台鸡尾酒迎宾', '机器人迎宾', '闻香识酒', '非遗互动',
    'AI+文旅出海主题沙龙', '开鱼秀', '机器人舞蹈', '产品走秀',
    '品鉴知识讲解', '东方主题节目', '抽奖及茅台互动游戏'
  ]) assert.ok(html.includes(value), `missing ${value}`);
});

test('salon page removes generic outbound copy', () => {
  for (const stale of ['中东、东南亚及全球市场', '目标市场选择', '支付、物流、合规、营销']) {
    assert.equal(html.includes(stale), false, `stale copy remains: ${stale}`);
  }
});

test('salon completion does not expose a registration number', () => {
  assert.equal(html.includes('报名已提交，编号'), false);
  assert.match(html, /id="successPanel"[^>]*hidden/);
  assert.match(html, /href="\/"[^>]*>完成并返回猎鹰展主页</);
  assert.match(html, /fetch\('\/api\/salon-registrations'/);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test`

Expected: existing falcon homepage tests pass; new salon tests fail because the old generic page lacks the confirmed identity, agenda, and completion panel.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/salon-page.test.mjs
git commit -m "test: define oriental falcon salon experience"
```

### Task 2: Rebuild the Salon Content and Visual Design

**Files:**
- Create: `public/falcon-expo-assets/salon-expo.jpg`
- Modify: `public/salon.html:1-400`
- Test: `tests/salon-page.test.mjs`

- [ ] **Step 1: Confirm salon tests are RED**

Run: `node --test tests/salon-page.test.mjs`

Expected: FAIL on event identity, schedule, agenda, stale copy, and completion state.

- [ ] **Step 2: Generate the real expo image**

Render page 3 of `/Users/mac/Desktop/2026年沙特国际猎鹰与狩猎展全球招商手册(1).pdf` at 240 DPI. Crop the photo-only expo crowd region, excluding slide headings and body text, and save it as:

```text
public/falcon-expo-assets/salon-expo.jpg
```

Output requirements: JPEG, at least 1200px wide, no embedded slide text, no company list, visually centered for a 16:10 section image.

- [ ] **Step 3: Replace the hero with the A visual direction**

Use the existing `falcon-expo-assets/hero-falcon.jpg` as the full-bleed hero background with a charcoal overlay. The first viewport contains:

```html
<span class="eyebrow">东方品鉴 · AI科技 · 国际资源</span>
<h1>精品东方<br>鹰耀出海</h1>
<p class="lead">以精品茅台为文化纽带，以AI+文旅出海为时代背景的高端商务沙龙与主题活动。</p>
<div class="event-meta">
  <strong>2026年8月7日</strong>
  <span>15:00 主题活动 · 18:00 精品晚宴</span>
  <span>成都高新区豪生酒店 · 武侯区天泰路338号</span>
</div>
<a class="cta" href="#register">限额报名</a>
```

Use charcoal, copper gold, white, and restrained vermilion. Keep cards at 8px radius and controls at least 44px high.

- [ ] **Step 4: Add the approved content sections**

Add these page sections in order:

```text
活动概述
三大活动价值：品牌文化输出 / 战略资源链接 / 企业家圈层社交
下午场 15:00
晚宴场 18:00
适合参与人群
限额报名
```

The afternoon and dinner sections must list every item from Task 1. Use `salon-expo.jpg` in the overview section and label it as a real falcon expo scene.

- [ ] **Step 5: Update registration choices**

Keep the existing field names required by the server. Replace the topic options with:

```html
<option>AI+文旅出海</option>
<option>中东市场与猎鹰展资源</option>
<option>品牌国际化与文化出海</option>
<option>高端消费与企业家圈层</option>
<option>渠道与商务合作</option>
```

Update the role options to include出海企业家、海外嘉宾、AI科技企业代表、高净值客户/投资人 and resource partners while retaining `其他`.

- [ ] **Step 6: Run content tests**

Run: `node --test tests/salon-page.test.mjs`

Expected: content, schedule, agenda, and stale-copy tests pass; completion test may remain RED until Task 3.

- [ ] **Step 7: Commit content and visual work**

```bash
git add public/salon.html public/falcon-expo-assets/salon-expo.jpg
git commit -m "feat: redesign oriental falcon salon page"
```

### Task 3: Implement Registration Completion and Production Verification

**Files:**
- Modify: `public/salon.html:337-465`
- Test: `tests/salon-page.test.mjs`
- Verify: `server.js`

- [ ] **Step 1: Add the hidden completion state**

Place after the form:

```html
<section class="success-panel" id="successPanel" hidden aria-live="polite">
  <strong>报名成功</strong>
  <p>报名信息已提交，工作人员会联系确认活动席位。</p>
  <a class="complete-button" href="/">完成并返回猎鹰展主页</a>
</section>
```

- [ ] **Step 2: Update submission behavior**

Implement these exact outcomes:

```js
if (location.protocol === 'file:') {
  setStatus('当前为本地预览，报名信息仅保存在当前浏览器，不会发送给活动方。请使用线上报名页面提交。', 'error');
  return;
}

// POST succeeds:
form.hidden = true;
successPanel.hidden = false;
successPanel.querySelector('.complete-button').focus();
```

Do not display `registrationId` or `localId`. Store a local backup before POST; on success remove only the current `localId` record; on failure preserve the form values and backup.

- [ ] **Step 3: Validate optional email and storage failures**

If the email is non-empty and `email.validity.valid` is false, focus it and display `请填写有效邮箱`. Wrap localStorage reads/writes in `try/catch` so storage failure does not prevent the network request.

- [ ] **Step 4: Run all automated checks**

Run:

```bash
npm test
node --check server.js
git diff --check
```

Expected: all homepage and salon tests PASS with no syntax or whitespace errors.

- [ ] **Step 5: Verify mobile behavior locally**

Start `PORT=4324 FALCON_DATA_DIR=/tmp/oriental-salon npm start`. Check 360×800, 390×844, and 430×932:

- no horizontal overflow;
- hero, hotel address, afternoon and dinner program are readable;
- empty submit shows the first required field;
- valid submit returns HTTP 201 and displays no number;
- completion button navigates to `/`;
- `salon-expo.jpg` loads with HTTP 200.

- [ ] **Step 6: Commit completion behavior**

```bash
git add public/salon.html tests/salon-page.test.mjs
git commit -m "feat: complete salon registration return flow"
```

- [ ] **Step 7: Push and verify Render**

Push `main`, wait for Render, then verify:

```text
https://falcon-expo.onrender.com/salon.html
https://falcon-expo.onrender.com/api/salon-health
```

Submit one production test registration, confirm it exists in Neon, delete the test row, and retain the live salon page in the in-app browser.
