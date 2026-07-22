import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/salon.html', import.meta.url), 'utf8');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findContainerByAttribute(source, tagName, attribute, value, description) {
  const escapedValue = escapeRegExp(value);
  const pattern = new RegExp(
    `<${tagName}\\b(?=[^>]*\\b${attribute}=["']${escapedValue}["'])[^>]*>[\\s\\S]*?<\\/${tagName}>`,
    'i'
  );
  const match = source.match(pattern);
  assert.ok(match, `salon page should contain ${description}`);
  return match[0];
}

function findClassContainer(source, tagName, className) {
  const escapedClassName = escapeRegExp(className);
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*class=["'][^"']*\\b${escapedClassName}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/${tagName}>`,
    'i'
  );
  const match = source.match(pattern);
  assert.ok(match, `salon page should contain .${className}`);
  return match[0];
}

function visibleText(source) {
  return source
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertVisibleTextIncludesAll(source, values, description) {
  const text = visibleText(source);
  const missing = values.filter((value) => !text.includes(value));
  assert.deepEqual(missing, [], `${description} is missing: ${missing.join(', ')}`);
}

function findInlineScript(source, marker) {
  const scripts = source.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const script = scripts.find((candidate) => candidate.includes(marker));
  assert.ok(script, `salon page should contain an inline script for ${marker}`);
  return script;
}

function findPromiseSuccessCallback(script) {
  const promiseChain = script.match(
    /fetch\(\s*["']\/api\/salon-registrations["'][\s\S]*?\.then\(\s*\(?\s*response\s*\)?\s*=>\s*\{([\s\S]*?)\}\s*\)\s*\.then\(\s*\(?\s*[\w$]*\s*\)?\s*=>\s*\{([\s\S]*?)\}\s*\)/
  );
  assert.ok(
    promiseChain,
    'submission should handle a validated response in a dedicated success callback'
  );
  assert.match(
    promiseChain[1],
    /if\s*\(\s*!response\.ok\s*\)\s*throw\b/,
    'the response callback should throw before success handling when response.ok is false'
  );
  return promiseChain[2];
}

test('salon hero identifies the Oriental Falcon event and its logistics', () => {
  const hero = findClassContainer(html, 'header', 'hero');
  const heading = hero.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);

  assert.ok(heading, 'salon hero should contain an h1');
  assert.equal(visibleText(heading[0]).replace(/[·\s]/g, ''), '精品东方鹰耀出海');
  assertVisibleTextIncludesAll(
    hero,
    [
      '2026年8月7日',
      '15:00',
      '18:00',
      '成都高新区豪生酒店',
      '武侯区天泰路338号',
      '定向邀约100余位'
    ],
    'salon hero event logistics'
  );
});

test('salon afternoon and dinner sections present their complete event flows', () => {
  const afternoon = findContainerByAttribute(
    html,
    'section',
    'data-section',
    'afternoon',
    '[data-section="afternoon"]'
  );
  const dinner = findContainerByAttribute(
    html,
    'section',
    'data-section',
    'dinner',
    '[data-section="dinner"]'
  );

  assertVisibleTextIncludesAll(
    afternoon,
    [
      '茅台鸡尾酒迎宾',
      '机器人迎宾',
      '茅台产品文化展',
      '闻香识酒',
      '非遗互动',
      'AI+文旅出海主题沙龙',
      '开鱼秀'
    ],
    'afternoon event flow'
  );
  assertVisibleTextIncludesAll(
    dinner,
    ['机器人舞蹈', '产品走秀', '品鉴知识讲解', '东方主题节目', '抽奖及茅台互动游戏'],
    'dinner event flow'
  );
});

test('salon page removes the generic outbound-market copy', () => {
  const pageText = visibleText(html);

  for (const staleCopy of [
    '中东、东南亚及全球市场',
    '目标市场选择',
    '支付、物流、合规、营销',
    '跨境服务与供应链团队',
    '中东、东南亚和全球增长机会'
  ]) {
    assert.equal(pageText.includes(staleCopy), false, `salon page should not contain: ${staleCopy}`);
  }
});

test('salon form owns every required registration control', () => {
  const form = findContainerByAttribute(html, 'form', 'id', 'salonForm', '#salonForm');

  for (const fieldName of ['name', 'phone', 'company', 'role', 'topic']) {
    const requiredControl = new RegExp(
      `<(?:input|select|textarea)\\b(?=[^>]*\\bname=["']${fieldName}["'])(?=[^>]*\\brequired(?:\\s|=|\\/?>))[^>]*>`,
      'i'
    );
    assert.match(form, requiredControl, `${fieldName} should be required inside #salonForm`);
  }
});

test('salon submission posts the required form data as JSON', () => {
  const script = findInlineScript(html, 'salonForm');
  const payloadDeclaration = script.match(/const\s+payload\s*=\s*\{([\s\S]*?)\}\s*;/);

  assert.ok(payloadDeclaration, 'submission should build an explicit payload object');
  for (const fieldName of ['name', 'phone', 'company', 'role', 'topic']) {
    assert.match(
      payloadDeclaration[1],
      new RegExp(
        `\\b${fieldName}\\s*:\\s*form\\.elements\\.${fieldName}\\.value\\.trim\\(\\)`
      ),
      `JSON payload should explicitly include trimmed ${fieldName}`
    );
  }
  assert.match(
    script,
    /fetch\(\s*["']\/api\/salon-registrations["']\s*,\s*\{[\s\S]*?method\s*:\s*["']POST["'][\s\S]*?body\s*:\s*JSON\.stringify\(payload\)[\s\S]*?\}\s*\)/,
    'submission should POST the JSON payload to /api/salon-registrations'
  );
});

test('successful salon submission reveals an accessible completion state', () => {
  const script = findInlineScript(html, 'salonForm');
  const successCallback = findPromiseSuccessCallback(script);
  const successPanel = findContainerByAttribute(html, 'section', 'id', 'successPanel', '#successPanel');

  assert.match(
    successPanel,
    /<section\b(?=[^>]*\bid=["']successPanel["'])(?=[^>]*\bhidden(?:\s|=|\/?>))[^>]*>/i,
    '#successPanel should initially be hidden'
  );
  assert.match(
    successPanel,
    /<a\b(?=[^>]*\bclass=["'][^"']*\bcomplete-button\b[^"']*["'])(?=[^>]*\bhref=["']\/["'])[^>]*>[\s\S]*?完成并返回猎鹰展主页[\s\S]*?<\/a>/i
  );
  assert.match(
    successCallback,
    /form\.hidden\s*=\s*true\s*;[\s\S]*?successPanel\.hidden\s*=\s*false\s*;[\s\S]*?successPanel\.querySelector\(\s*["']\.complete-button["']\s*\)\.focus\(\s*\)\s*;/,
    'the success callback should hide the form, reveal the panel, then focus the completion button'
  );
  assert.doesNotMatch(
    script,
    /\b(?:window\.)?location\s*=|\b(?:window\.)?location\.(?:href\s*=|assign\s*\(|replace\s*\()/,
    'successful submission should not navigate automatically'
  );
});

test('salon page never exposes registration identifiers to users', () => {
  assert.doesNotMatch(visibleText(html), /registrationId|localId|报名编号|报名已提交，编号/i);

  const script = findInlineScript(html, 'salonForm');
  assert.doesNotMatch(
    script,
    /(?:setStatus\s*\(|(?:textContent|innerText|innerHTML)\s*=)[\s\S]{0,240}\b(?:registrationId|localId)\b/,
    'registration identifiers should never be written to visible UI'
  );
});
