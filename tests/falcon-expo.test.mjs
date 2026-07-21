import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('homepage contains the latest handbook facts', () => {
  const latestFacts = [
    '70万+',
    '1,400+',
    '47个国家',
    '28+专业领域',
    '3.98亿+',
    '9㎡标准展位',
    'USD 10,800',
    'USD 12,420',
    '12㎡标准展位',
    'USD 14,400',
    'USD 16,560',
    'shawn@keyi2030.com',
    '+86 18628342749',
    '+966 566057654'
  ];

  for (const fact of latestFacts) {
    assert.ok(html.includes(fact), `homepage should contain latest fact: ${fact}`);
  }
});

test('homepage removes stale booth prices and company lists', () => {
  const staleContent = [
    '14㎡标准展位',
    '70㎡特定展位',
    'SAR 63,000',
    'SAR 315,000',
    'cgdqyj@gmail.com',
    'Tiger Rover Sport Optics'
  ];

  for (const stale of staleContent) {
    assert.equal(html.includes(stale), false, `homepage should not contain stale content: ${stale}`);
  }
});

test('homepage lists the eight product recruitment categories', () => {
  const categories = [
    '光学设备',
    '车顶帐篷',
    '露营装备',
    '冷藏设备',
    '户外照明',
    '烧烤工具',
    '储水与户外家具',
    '保温饮具'
  ];

  for (const category of categories) {
    assert.ok(html.includes(category), `homepage should list product category: ${category}`);
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
