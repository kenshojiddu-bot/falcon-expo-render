# Falcon Expo Latest Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the mobile-first falcon expo homepage and local chat knowledge base from the two latest PDFs, including current booth prices, product recruitment scope, official contacts, and a new real-falcon visual treatment.

**Architecture:** Keep the existing Express service and form APIs unchanged. Move the local knowledge entries and relevance scoring into one browser-compatible script that can also be exercised by Node tests, while retaining the homepage as a static HTML document. Generate optimized JPG assets from the supplied PDFs and reference them from responsive CSS.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Express 4, PostgreSQL via `pg`, Render Web Service.

---

## File Map

- Create `public/falcon-knowledge.js`: latest handbook facts and deterministic keyword relevance scoring.
- Create `public/falcon-expo-assets/hero-falcon.jpg`: real falcon image extracted from Chinese handbook page 20.
- Create `public/falcon-expo-assets/product-scope.jpg`: product collage extracted from the Arabic product profile.
- Create `tests/falcon-expo.test.mjs`: source-of-truth content, stale-content, knowledge, and asset assertions.
- Modify `public/index.html`: visual refresh, current content, product recruitment section, current contact details, and knowledge integration.
- Modify `package.json`: add `npm test` using Node's built-in test runner.

### Task 1: Add Failing Source-of-Truth Tests

**Files:**
- Create: `tests/falcon-expo.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the test command**

Add this script to `package.json`:

```json
"scripts": {
  "start": "node server.js",
  "test": "node --test tests/*.test.mjs"
}
```

- [ ] **Step 2: Write content and knowledge tests**

Create `tests/falcon-expo.test.mjs` with Node assertions that read `public/index.html`, load `public/falcon-knowledge.js` in a VM context, and verify:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('homepage contains the latest handbook facts', () => {
  for (const expected of [
    '70万+', '1,400+', '47个国家', '28+专业领域', '3.98亿+',
    '9㎡标准展位', 'USD 10,800', 'USD 12,420',
    '12㎡标准展位', 'USD 14,400', 'USD 16,560',
    'shawn@keyi2030.com', '+86 18628342749', '+966 566057654'
  ]) assert.match(html, new RegExp(expected.replace(/[+]/g, '\\+')));
});

test('homepage removes stale booth prices and company lists', () => {
  for (const stale of ['14㎡标准展位', '70㎡特定展位', 'SAR 63,000', 'SAR 315,000', 'cgdqyj@gmail.com']) {
    assert.equal(html.includes(stale), false);
  }
  assert.equal(html.includes('Tiger Rover Sport Optics'), false);
});

test('homepage lists the eight product recruitment categories', () => {
  for (const category of ['光学设备', '车顶帐篷', '露营装备', '冷藏设备', '户外照明', '烧烤工具', '储水与户外家具', '保温饮具']) {
    assert.match(html, new RegExp(category));
  }
});

test('knowledge answers the most relevant current topic', async () => {
  const source = await readFile(new URL('../public/falcon-knowledge.js', import.meta.url), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const { answerQuestion } = context.window.FalconKnowledge;
  assert.match(answerQuestion('12平米展位含税多少钱'), /16,560/);
  assert.match(answerQuestion('适合招哪些户外产品'), /8大品类/);
  assert.match(answerQuestion('沙特联系人电话'), /566057654/);
});
```

- [ ] **Step 3: Run the tests and verify RED**

Run: `npm test`

Expected: FAIL because `public/falcon-knowledge.js` does not exist and the homepage still contains stale prices and contact details.

- [ ] **Step 4: Commit the failing tests**

```bash
git add package.json tests/falcon-expo.test.mjs
git commit -m "test: define latest falcon expo handbook content"
```

### Task 2: Implement the Current Knowledge Base

**Files:**
- Create: `public/falcon-knowledge.js`
- Modify: `public/index.html:842-1022`
- Test: `tests/falcon-expo.test.mjs`

- [ ] **Step 1: Create browser-compatible knowledge data and scoring**

Create `public/falcon-knowledge.js` as a plain script that publishes one stable interface:

```js
(function exposeFalconKnowledge(global) {
  const entries = [
    {
      keywords: ['时间', '日期', '地点', '利雅得'],
      answer: '展会将于2026年10月1日-10日在沙特阿拉伯利雅得会展中心举行。'
    },
    {
      keywords: ['价格', '费用', '展位', '9平米', '9㎡', '12平米', '12㎡', '含税', 'vat'],
      answer: '2026年参考价：9㎡标准展位 USD 10,800，含VAT为 USD 12,420；12㎡标准展位 USD 14,400，含VAT为 USD 16,560。最终以官方确认和合同为准。'
    },
    {
      keywords: ['产品', '品类', '招商', '户外', '光学', '帐篷', '冷藏', '照明'],
      answer: '产品招商覆盖8大品类：光学设备、车顶帐篷、露营装备、冷藏设备、户外照明、烧烤工具、储水与户外家具、保温饮具，资料涵盖100款精选产品方向。'
    },
    {
      keywords: ['数据', '规模', '观众', '品牌', '国家', '曝光', '面积'],
      answer: '2025年展会数据：70万+观众、1,400+参展商与品牌、47个国家、28+专业领域、3.98亿+社交媒体曝光；展览面积197,411+平方米。'
    },
    {
      keywords: ['展区', '中国展区', '主展区', '拍卖', 'vip', '活动区'],
      answer: '展区包括主展区、中国展区、赞助区、活动与表演区、刀具与VIP专区及全球拍卖服务区。'
    },
    {
      keywords: ['赞助', '钻石', '铂金', '黄金', '官方供应商'],
      answer: '赞助分为钻石赞助商、铂金赞助商、黄金赞助商和官方供应商，权益覆盖冠名、VIP礼遇、核心位置展示、媒体曝光及官方认证。'
    },
    {
      keywords: ['商务', '对接', '政府', '考察', '买家', '客户'],
      answer: '商务服务包括一对一洽谈、政府与企业对接、投资环境考察和定制化商务行程。'
    },
    {
      keywords: ['流程', '申请', '报名', '合同', '参展'],
      answer: '参展流程为：提交申请、资质审核与合同签订、费用支付与筹备启动、展前准备、现场运营、展后跟进与评估。'
    },
    {
      keywords: ['联系', '电话', '邮箱', '网站', '官网', '沙特联系人'],
      answer: '官方网站：sfc.org.sa、fhe.sfc.org.sa。中国区官方合作伙伴柯亦科技：shawn@keyi2030.com；陆女士 +86 18628342749；陈先生（沙特）+966 566057654。'
    }
  ];

  function answerQuestion(question) {
    const normalized = String(question || '').toLowerCase().replace(/\s+/g, '');
    const ranked = entries
      .map((entry, index) => ({
        entry,
        index,
        score: entry.keywords.reduce((total, keyword) => total + (normalized.includes(keyword.toLowerCase().replace(/\s+/g, '')) ? keyword.length : 0), 0)
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index);
    return ranked[0]?.entry.answer || '这个问题尚未在最新版资料中直接匹配到。请填写页面申请表，或联系中国区官方合作伙伴柯亦科技：shawn@keyi2030.com / +86 18628342749。';
  }

  global.FalconKnowledge = { entries, answerQuestion };
})(window);
```

- [ ] **Step 2: Connect the chat UI to the shared interface**

Insert before the existing inline script:

```html
<script src="falcon-knowledge.js"></script>
```

Remove the old inline `knowledge` array and replace the old first-hit function with:

```js
function answerQuestion(question) {
  return window.FalconKnowledge.answerQuestion(question);
}
```

Change the product quick question text to `产品招商范围` and update the greeting to state that answers are based on the latest 2026 handbook and product profile.

- [ ] **Step 3: Run the focused knowledge test**

Run: `npm test -- --test-name-pattern="knowledge"`

Expected: PASS.

- [ ] **Step 4: Commit the knowledge implementation**

```bash
git add public/falcon-knowledge.js public/index.html
git commit -m "feat: update falcon expo local knowledge base"
```

### Task 3: Update Content and Real PDF Visual Assets

**Files:**
- Create: `public/falcon-expo-assets/hero-falcon.jpg`
- Create: `public/falcon-expo-assets/product-scope.jpg`
- Modify: `public/index.html:7-838`
- Test: `tests/falcon-expo.test.mjs`

- [ ] **Step 1: Verify content tests remain RED before the homepage edit**

Run: `npm test -- --test-name-pattern="homepage"`

Expected: FAIL on stale booth prices, missing current contacts, and missing product scope.

- [ ] **Step 2: Generate optimized source-backed images**

Render Chinese handbook page 20 and Arabic product profile pages 6, 8, 10, 15, and 17 at 240 DPI into `tmp/pdfs/production/`. Use Pillow to crop the image-only rectangles observed in those pages, compose the product crops on a charcoal canvas, and save with these exact output constraints:

```text
public/falcon-expo-assets/hero-falcon.jpg      1200 x 1600, quality 88
public/falcon-expo-assets/product-scope.jpg    1200 x 720, quality 88
```

The collage contains products only and excludes company names and source-page text.

- [ ] **Step 3: Replace the hero and background treatment**

Update the hero to use:

```css
.hero::before {
  background:
    linear-gradient(180deg, rgba(9, 9, 9, 0.08) 18%, rgba(9, 9, 9, 0.45) 52%, rgba(9, 9, 9, 0.94) 86%),
    url("falcon-expo-assets/hero-falcon.jpg") 58% 42% / cover no-repeat;
}
```

Remove the body radial gradient and use a restrained charcoal surround. Keep the page surface warm white, cards at 8px radius, and all interactive controls at least 44px high.

- [ ] **Step 4: Replace stale facts and add product recruitment scope**

Update the page with the exact approved values. Replace booth options in both the price cards and application form:

```html
<option>9㎡标准展位</option>
<option>12㎡标准展位</option>
```

Add the product section immediately after the general recruitment categories:

```html
<section class="product-scope section" aria-labelledby="product-scope-title">
  <div class="product-scope-media" role="img" aria-label="适合沙特沙漠环境的光学、露营、冷藏与照明产品"></div>
  <div class="section-title"><h2 id="product-scope-title">产品招商范围</h2></div>
  <p class="section-lead">最新版产品资料覆盖100款精选产品方向，聚焦8大主要品类；本页仅展示招商范围，不展示企业名单。</p>
  <div class="product-grid">
    <article><strong>光学设备</strong><span>测距仪、双筒望远镜、热成像设备</span></article>
    <article><strong>车顶帐篷</strong><span>硬壳、软壳及快速展开产品</span></article>
    <article><strong>露营装备</strong><span>帐篷、天幕、折叠椅与折叠桌</span></article>
    <article><strong>冷藏设备</strong><span>车载冰箱、冷暖箱、冷藏箱与冷藏包</span></article>
    <article><strong>户外照明</strong><span>手电、头灯、营地灯、工作灯</span></article>
    <article><strong>烧烤工具</strong><span>便携式多功能烧烤工具与套装</span></article>
    <article><strong>储水与户外家具</strong><span>食品级储水箱、露营桌椅</span></article>
    <article><strong>保温饮具</strong><span>耐沙漠高温的保温杯与保温壶</span></article>
  </div>
</section>
```

- [ ] **Step 5: Update current contacts and remove internal deployment wording**

Show `shawn@keyi2030.com`, both phone numbers, and official websites. Replace user-facing sentences about Render/localStorage with neutral confirmation language.

- [ ] **Step 6: Run all automated tests**

Run: `npm test`

Expected: all tests PASS and no stale price/contact strings remain.

- [ ] **Step 7: Commit the content and visual refresh**

```bash
git add public/index.html public/falcon-expo-assets/hero-falcon.jpg public/falcon-expo-assets/product-scope.jpg tests/falcon-expo.test.mjs
git commit -m "feat: refresh falcon expo homepage from latest materials"
```

### Task 4: Mobile, API, and Production Verification

**Files:**
- Verify: `public/index.html`
- Verify: `server.js`
- Verify: deployed Render service

- [ ] **Step 1: Start a clean local service**

Run:

```bash
PORT=4321 FALCON_DATA_DIR=/tmp/falcon-expo-latest npm start
```

Expected: `Falcon expo server listening on 4321`.

- [ ] **Step 2: Check at 390 x 844 and desktop width**

Use the browser at `http://127.0.0.1:4321/`. Verify the hero is nonblank and correctly cropped, text and buttons do not overlap, product cards fit, form controls are at least 44px high, and Chat opens/closes without hiding the final form feedback.

- [ ] **Step 3: Exercise knowledge queries in the UI**

Ask `12平米展位含税多少钱`, `产品招商范围`, `商务对接`, and `沙特联系人`. Expected replies must use current handbook values and contacts.

- [ ] **Step 4: Exercise form validation and API submission**

Submit an empty form and verify the first required field is announced. Then POST a complete test application to `/api/applications`, verify HTTP 201, and remove the test record from the configured test store or Neon database after validation.

- [ ] **Step 5: Push and wait for Render**

Run:

```bash
git push origin main
```

Wait until `https://falcon-expo.onrender.com/api/health` returns HTTP 200 and the live homepage contains `9㎡标准展位`, `产品招商范围`, and `shawn@keyi2030.com`.

- [ ] **Step 6: Final production smoke test**

Open `https://falcon-expo.onrender.com` at a mobile viewport and repeat the visual, Chat, and one API submission check. Delete the production test record and report the final live URL.
