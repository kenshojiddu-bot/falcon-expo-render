import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const staleContent = [
  '14㎡标准展位',
  '70㎡特定展位',
  'SAR 63,000',
  'SAR 315,000',
  'USD 16,800',
  'USD 84,000',
  'cgdqyj@gmail.com',
  'Tiger Rover Sport Optics'
];
const productCategories = [
  '光学设备',
  '车顶帐篷',
  '露营装备',
  '冷藏设备',
  '户外照明',
  '烧烤工具',
  '储水与户外家具',
  '保温饮具'
];

function findSection(pattern, description) {
  const sections = html.match(/<section\b[\s\S]*?<\/section>/g) ?? [];
  const section = sections.find((candidate) => pattern.test(candidate));
  assert.ok(section, `homepage should contain ${description} section`);
  return section;
}

function findClassContainer(source, tagName, className) {
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*class=["'][^"']*\\b${escapedClassName}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/${tagName}>`
  );
  const match = source.match(pattern);
  assert.ok(match, `homepage should contain .${className}`);
  return match[0];
}

function findArticle(source, marker) {
  const articles = source.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
  const article = articles.find((candidate) => candidate.includes(marker));
  assert.ok(article, `section should contain an article for ${marker}`);
  return article;
}

async function loadKnowledge() {
  const source = await readFile(new URL('../public/falcon-knowledge.js', import.meta.url), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  assert.ok(context.window.FalconKnowledge, 'knowledge script should export window.FalconKnowledge');
  return { source, ...context.window.FalconKnowledge };
}

test('homepage associates the latest date and location with the event hero', () => {
  const hero = findClassContainer(html, 'header', 'hero');

  for (const fact of ['2026年10月1日-10日', '利雅得会展中心']) {
    assert.ok(hero.includes(fact), `event hero should contain latest fact: ${fact}`);
  }
});

test('homepage contains the latest event metrics', () => {
  for (const metric of ['70万+', '1,400+', '47个国家', '28+专业领域', '3.98亿+']) {
    assert.ok(html.includes(metric), `homepage should contain latest metric: ${metric}`);
  }
});

test('homepage associates each booth size with its base and VAT prices', () => {
  const priceGrid = findClassContainer(html, 'div', 'price-grid');
  const nineSquareMetreBooth = findArticle(priceGrid, '9㎡标准展位');
  const twelveSquareMetreBooth = findArticle(priceGrid, '12㎡标准展位');

  assert.ok(nineSquareMetreBooth.includes('USD 10,800'));
  assert.ok(nineSquareMetreBooth.includes('USD 12,420'));
  assert.doesNotMatch(nineSquareMetreBooth, /USD 14,400|USD 16,560/);
  assert.ok(twelveSquareMetreBooth.includes('USD 14,400'));
  assert.ok(twelveSquareMetreBooth.includes('USD 16,560'));
  assert.doesNotMatch(twelveSquareMetreBooth, /USD 10,800|USD 12,420/);
});

test('homepage product scope contains exactly the eight approved categories', () => {
  const productSection = findSection(/id=["']product-scope-title["']/, 'product scope');
  const productArticles = productSection.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];

  assert.equal(productArticles.length, 8, 'product scope should contain exactly eight product articles');
  const categoryArticleIndexes = productCategories.map((category) => {
    const matchingIndexes = productArticles.flatMap((article, index) =>
      article.includes(category) ? [index] : []
    );
    assert.equal(matchingIndexes.length, 1, `product scope should contain exactly one article for ${category}`);
    return matchingIndexes[0];
  });

  assert.equal(
    new Set(categoryArticleIndexes).size,
    productCategories.length,
    'each approved category should use a distinct product article'
  );
  for (const [index, article] of productArticles.entries()) {
    const matchingCategories = productCategories.filter((category) => article.includes(category));
    assert.equal(matchingCategories.length, 1, `product article ${index + 1} should contain exactly one approved category`);
  }
});

test('homepage contact section contains only the latest contacts', () => {
  const contactSection = findSection(/<h2[^>]*>\s*联系方式\s*<\/h2>/, 'contact');

  for (const contact of ['shawn@keyi2030.com', '+86 18628342749', '+966 566057654']) {
    assert.ok(contactSection.includes(contact), `contact section should contain ${contact}`);
  }
  assert.equal(contactSection.includes('cgdqyj@gmail.com'), false);
});

test('homepage and knowledge source and entries remove all stale handbook content', async () => {
  const { source, entries } = await loadKnowledge();
  assert.ok(Array.isArray(entries), 'knowledge script should export entries');
  const contentTargets = [
    ['homepage HTML', html],
    ['knowledge source', source],
    ['knowledge entries', JSON.stringify(entries)]
  ];

  for (const stale of staleContent) {
    for (const [description, content] of contentTargets) {
      assert.equal(content.includes(stale), false, `${description} should not contain stale content: ${stale}`);
    }
  }
});

test('knowledge answers the latest direct questions', async () => {
  const { answerQuestion } = await loadKnowledge();
  assert.equal(typeof answerQuestion, 'function');
  assert.match(answerQuestion('12平米展位含税多少钱'), /16,560/);
  assert.match(answerQuestion('适合招哪些户外产品'), /8大品类/);
  assert.match(answerQuestion('沙特联系人电话'), /566057654/);
});

test('knowledge returns only the most relevant answer for an ambiguous multi-topic question', async () => {
  const { answerQuestion } = await loadKnowledge();
  const answer = answerQuestion('展位价格和联系电话稍后再说，先介绍适合招商的户外产品品类，包括光学、帐篷、冷藏和照明');

  assert.match(answer, /8大品类/);
  assert.doesNotMatch(answer, /16,560|566057654/);
});
