import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/salon.html', import.meta.url), 'utf8');

function assertIncludesAll(values, description) {
  const missing = values.filter((value) => !html.includes(value));
  assert.deepEqual(missing, [], `${description} is missing: ${missing.join(', ')}`);
}

test('salon page identifies the Oriental Falcon event and its logistics', () => {
  assertIncludesAll(
    [
      '精品东方·鹰耀出海',
      '2026年8月7日',
      '15:00',
      '18:00',
      '成都高新区豪生酒店',
      '武侯区天泰路338号',
      '定向邀约100余位'
    ],
    'salon event identity and logistics'
  );
});

test('salon page presents the complete event flow', () => {
  assertIncludesAll(
    [
      '茅台鸡尾酒迎宾',
      '机器人迎宾',
      '茅台产品文化展',
      '闻香识酒',
      '非遗互动',
      'AI+文旅出海主题沙龙',
      '开鱼秀',
      '机器人舞蹈',
      '产品走秀',
      '品鉴知识讲解',
      '东方主题节目',
      '抽奖及茅台互动游戏'
    ],
    'salon event flow'
  );
});

test('salon page removes the generic outbound-market copy', () => {
  for (const staleCopy of [
    '中东、东南亚及全球市场',
    '目标市场选择',
    '支付、物流、合规、营销'
  ]) {
    assert.equal(html.includes(staleCopy), false, `salon page should not contain: ${staleCopy}`);
  }
});

test('salon submission uses a confirmation panel without a registration number', () => {
  assert.equal(html.includes('报名已提交，编号'), false);

  const successPanel = html.match(
    /<([a-z][\w-]*)\b(?=[^>]*\bid=["']successPanel["'])(?=[^>]*\bhidden(?:\s|=|\/?>))[^>]*>([\s\S]*?)<\/\1>/i
  );
  assert.ok(successPanel, 'salon page should contain a hidden #successPanel');
  assert.doesNotMatch(successPanel[0], /编号/);
  assert.match(
    successPanel[0],
    /<a\b(?=[^>]*\bhref=["']\/["'])[^>]*>[\s\S]*?完成并返回猎鹰展主页[\s\S]*?<\/a>/i
  );
  assert.ok(html.includes("fetch('/api/salon-registrations')"));
});

test('salon registration keeps all required form fields', () => {
  for (const fieldName of ['name', 'phone', 'company', 'role', 'topic']) {
    const requiredControl = new RegExp(
      `<(?:input|select|textarea)\\b(?=[^>]*\\bname=["']${fieldName}["'])(?=[^>]*\\brequired(?:\\s|=|\\/?>))[^>]*>`,
      'i'
    );
    assert.match(html, requiredControl, `${fieldName} should remain a required form field`);
  }
});
