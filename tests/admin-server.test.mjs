import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const testAdminPassword = 'test-admin-password';

function waitForServer(child, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('server did not start')), timeoutMs);
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('Falcon expo server listening')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`server exited before startup with code ${code}`));
    });
  });
}

async function startServer(overrides = {}) {
  const port = 47000 + Math.floor(Math.random() * 1000);
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'falcon-admin-test-'));
  const env = {
    ...process.env,
    PORT: String(port),
    FALCON_DATA_DIR: dataDir,
    DATABASE_URL: '',
    ADMIN_PASSWORD: testAdminPassword,
    ADMIN_SESSION_SECRET: 'test-session-secret-with-enough-entropy',
    ...overrides
  };
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitForServer(child);
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    child,
    dataDir,
    async close() {
      child.kill('SIGTERM');
      await rm(dataDir, { recursive: true, force: true });
    }
  };
}

async function postJson(url, body, cookie) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body)
  });
}

test('admin endpoints require configured secrets', async () => {
  const server = await startServer({ ADMIN_PASSWORD: '', ADMIN_SESSION_SECRET: '' });
  try {
    const response = await postJson(`${server.baseUrl}/api/admin/login`, { password: testAdminPassword });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: 'admin_not_configured' });
  } finally {
    await server.close();
  }
});

test('admin login protects and combines expo and salon submissions', async () => {
  const server = await startServer();
  try {
    const unauthorized = await fetch(`${server.baseUrl}/api/admin/submissions`);
    assert.equal(unauthorized.status, 401);

    const wrong = await postJson(`${server.baseUrl}/api/admin/login`, { password: 'wrong' });
    assert.equal(wrong.status, 401);
    assert.deepEqual(await wrong.json(), { ok: false, error: 'invalid_credentials' });

    const expo = await postJson(`${server.baseUrl}/api/applications`, {
      company: '远航装备',
      contact: '张经理',
      phone: '13800138000',
      role: '参展商',
      category: '户外照明',
      booth: '12㎡标准展位',
      city: '成都'
    });
    assert.equal(expo.status, 201);

    const salon = await postJson(`${server.baseUrl}/api/salon-registrations`, {
      name: '李女士',
      phone: '13900139000',
      company: '东方文旅',
      role: '出海企业家',
      topic: 'AI+文旅出海',
      city: '上海'
    });
    assert.equal(salon.status, 201);

    const login = await postJson(`${server.baseUrl}/api/admin/login`, { password: testAdminPassword });
    assert.equal(login.status, 200);
    assert.deepEqual(await login.json(), { ok: true });
    const setCookie = login.headers.get('set-cookie');
    assert.match(setCookie, /falcon_admin_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    const cookie = setCookie.split(';', 1)[0];

    const recordsResponse = await fetch(`${server.baseUrl}/api/admin/submissions`, {
      headers: { Cookie: cookie }
    });
    assert.equal(recordsResponse.status, 200);
    assert.equal(recordsResponse.headers.get('cache-control'), 'no-store');
    const payload = await recordsResponse.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.submissions.length, 2);
    assert.deepEqual(new Set(payload.submissions.map((item) => item.type)), new Set(['expo', 'salon']));
    const expoRecord = payload.submissions.find((item) => item.type === 'expo');
    const salonRecord = payload.submissions.find((item) => item.type === 'salon');
    assert.equal(expoRecord.company, '远航装备');
    assert.equal(expoRecord.name, '张经理');
    assert.equal(expoRecord.details.category, '户外照明');
    assert.equal(salonRecord.company, '东方文旅');
    assert.equal(salonRecord.name, '李女士');
    assert.equal(salonRecord.details.topic, 'AI+文旅出海');

    const logout = await postJson(`${server.baseUrl}/api/admin/logout`, {}, cookie);
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/i);
  } finally {
    await server.close();
  }
});

test('admin login throttles repeated wrong passwords', async () => {
  const server = await startServer();
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await postJson(`${server.baseUrl}/api/admin/login`, { password: '000000' });
      assert.equal(response.status, 401);
    }
    const blocked = await postJson(`${server.baseUrl}/api/admin/login`, { password: testAdminPassword });
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), { ok: false, error: 'too_many_attempts' });
  } finally {
    await server.close();
  }
});
