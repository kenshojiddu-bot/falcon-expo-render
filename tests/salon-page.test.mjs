import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

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

function findElementById(source, id, description) {
  const escapedId = escapeRegExp(id);
  const pattern = new RegExp(
    `<([a-z][\\w-]*)\\b(?=[^>]*\\bid=["']${escapedId}["'])[^>]*>[\\s\\S]*?<\\/\\1>`,
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

function inlineScriptSource(source, marker) {
  const match = findInlineScript(source, marker).match(/^<script\b[^>]*>([\s\S]*)<\/script>$/i);
  assert.ok(match, 'inline salon script should have a script body');
  return match[1];
}

function findSectionByHeading(source, headingText) {
  const sections = source.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
  const section = sections.find((candidate) => {
    const heading = candidate.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
    return heading && visibleText(heading[0]).includes(headingText);
  });
  assert.ok(section, `salon page should contain a section titled ${headingText}`);
  return section;
}

function findCompletionLink(source) {
  const successPanel = source.match(
    /<([a-z][\w-]*)\b(?=[^>]*\bid=["']successPanel["'])[^>]*>[\s\S]*?<\/\1>/i
  )?.[0];
  const link = successPanel?.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0];
  if (!link) return null;
  const openingTag = link.match(/^<a\b([^>]*)>/i)?.[1] ?? '';
  const attributes = Object.fromEntries(
    [...openingTag.matchAll(/\b([\w-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1], match[2]])
  );
  return { attributes };
}

function matchesCompletionLink(selector, link) {
  if (!link || typeof selector !== 'string') return false;
  const trimmed = selector.trim();
  const { id, class: className, href } = link.attributes;
  if (trimmed === 'a') return true;
  if (trimmed === `a[href="${href}"]`) return Boolean(href);
  if (trimmed.startsWith('.') && className) return className.split(/\s+/).includes(trimmed.slice(1));
  if (trimmed.startsWith('#')) return trimmed.slice(1) === id;
  return false;
}

async function flushAsyncWork() {
  for (let round = 0; round < 5; round += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function runSalonSubmission() {
  const values = {
    name: '林鹰',
    phone: '13800138000',
    company: '猎鹰国际',
    role: '出海企业家',
    topic: 'AI+文旅出海',
    email: '',
    city: '',
    interest: '',
    note: ''
  };
  const controls = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, { id: name, name, value }])
  );
  const requiredControls = ['name', 'phone', 'company', 'role', 'topic'].map(
    (name) => controls[name]
  );
  const formHandlers = {};
  let prevented = false;
  let focusCalled = false;
  let locationChanged = false;
  const visibleWrites = [];
  function trackedVisibleElement() {
    const values = { textContent: '', innerText: '', innerHTML: '' };
    const element = { visibleWrites };
    for (const property of Object.keys(values)) {
      Object.defineProperty(element, property, {
        get() {
          return values[property];
        },
        set(value) {
          values[property] = value;
          visibleWrites.push(value == null ? '' : String(value));
        }
      });
    }
    return element;
  }
  const status = trackedVisibleElement();
  const successPanel = trackedVisibleElement();
  const completeButton = trackedVisibleElement();
  const label = trackedVisibleElement();
  const originalLocationHref = 'https://example.test/salon.html';
  let locationValue;
  const completionLink = findCompletionLink(html);
  const form = Object.assign(trackedVisibleElement(), {
    hidden: false,
    elements: {
      ...controls,
      namedItem(name) {
        return this[name];
      }
    },
    addEventListener(type, handler) {
      formHandlers[type] = handler;
    },
    querySelectorAll(selector) {
      return selector === '[required]' ? requiredControls : [];
    },
    querySelector() {
      label.textContent = '字段';
      return label;
    },
    reset() {
    }
  });
  completeButton.focus = function focus() {
    focusCalled = true;
  };
  successPanel.hidden = true;
  successPanel.querySelector = function querySelector(selector) {
    return matchesCompletionLink(selector, completionLink)
      ? completeButton
      : null;
  };
  const locationObject = {
    protocol: 'https:',
    get href() {
      return originalLocationHref;
    },
    set href(value) {
      locationChanged = true;
      void value;
    },
    assign() {
      locationChanged = true;
    },
    replace() {
      locationChanged = true;
    }
  };
  locationValue = locationObject;
  const window = new Proxy({ location: locationObject }, {
    set(target, property, value) {
      if (property === 'location') locationChanged = true;
      target[property] = value;
      return true;
    }
  });
  const documentElements = {
    status,
    successPanel
  };
  if (completionLink?.attributes.id) documentElements[completionLink.attributes.id] = completeButton;
  const document = {
    get location() {
      return locationValue;
    },
    set location(value) {
      locationChanged = true;
      locationValue = value;
    },
    querySelector(selector) {
      return matchesCompletionLink(selector, completionLink)
        ? completeButton
        : null;
    },
    getElementById(id) {
      return { salonForm: form, ...documentElements }[id] ?? null;
    }
  };
  const storage = new Map();
  const localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    }
  };
  const fetchCalls = [];
  const fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 201,
      async json() {
        return { registrationId: 'server-only-id' };
      }
    };
  };
  class FormDataMock {
    constructor(target) {
      this.target = target;
    }

    entries() {
      return Object.entries(values);
    }
  }
  const sandbox = { document, fetch, FormData: FormDataMock, localStorage, window, setTimeout, clearTimeout };
  Object.defineProperty(sandbox, 'location', {
    configurable: true,
    get() {
      return locationValue;
    },
    set(value) {
      locationChanged = true;
      locationValue = value;
    }
  });

  vm.runInNewContext(inlineScriptSource(html, 'salonForm'), sandbox);
  assert.equal(typeof formHandlers.submit, 'function', 'salon form should register a submit handler');
  await formHandlers.submit({
    preventDefault() {
      prevented = true;
    }
  });
  await flushAsyncWork();

  return {
    fetchCalls,
    form,
    successPanel,
    status,
    focusCalled,
    locationChanged,
    locationHref: locationValue === locationObject ? locationObject.href : locationValue,
    initialLocationHref: originalLocationHref,
    prevented,
    visibleWrites
  };
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
  const afternoon = findSectionByHeading(html, '下午场');
  const dinner = findSectionByHeading(html, '晚宴场');

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

test('salon submission posts form values and reveals the completion state on API success', async () => {
  const result = await runSalonSubmission();

  assert.equal(result.prevented, true);
  assert.equal(result.fetchCalls.length, 1, 'submission should make one API request');
  assert.equal(result.fetchCalls[0].url, '/api/salon-registrations');
  assert.equal(result.fetchCalls[0].options.method, 'POST');
  const payload = JSON.parse(result.fetchCalls[0].options.body);
  for (const [fieldName, expectedValue] of Object.entries({
    name: '林鹰',
    phone: '13800138000',
    company: '猎鹰国际',
    role: '出海企业家',
    topic: 'AI+文旅出海'
  })) {
    assert.equal(payload[fieldName], expectedValue, `JSON payload should contain ${fieldName}`);
  }
  assert.equal(result.form.hidden, true);
  assert.equal(result.successPanel.hidden, false);
  assert.equal(result.focusCalled, true);
  assert.doesNotMatch(
    result.visibleWrites.join('\n'),
    /registrationId|localId|报名编号|编号|SALON-[A-Z0-9-]+/i
  );
  assert.equal(result.locationChanged, false);
  assert.equal(result.locationHref, result.initialLocationHref);
});

test('salon completion panel uses the homepage link contract', () => {
  const successPanel = findElementById(html, 'successPanel', '#successPanel');

  assert.match(
    successPanel,
    /<[^>]+\bid=["']successPanel["'][^>]*\bhidden(?:\s|=|\/?>)/i,
    '#successPanel should initially be hidden'
  );
  assert.match(
    successPanel,
    /<a\b(?=[^>]*\bhref=["']\/["'])[^>]*>[\s\S]*?完成并返回猎鹰展主页[\s\S]*?<\/a>/i
  );
});

test('salon page never exposes registration identifiers to users', () => {
  assert.doesNotMatch(visibleText(html), /registrationId|localId|报名编号|报名已提交，编号/i);
});
