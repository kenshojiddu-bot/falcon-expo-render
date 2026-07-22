import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

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

test('database failures return 503 without terminating the salon service', { timeout: 10000 }, async () => {
  const port = 46000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer(child);
    const response = await fetch(`http://127.0.0.1:${port}/api/salon-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '数据库容错测试',
        phone: '13800138000',
        company: '测试机构',
        role: '出海企业家',
        topic: 'AI+文旅出海'
      })
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: 'submission_unavailable' });

    const health = await fetch(`http://127.0.0.1:${port}/api/salon-health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    const malformed = await fetch(`http://127.0.0.1:${port}/api/salon-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":'
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { ok: false, error: 'invalid_request' });
    assert.equal(child.exitCode, null);
  } finally {
    child.kill('SIGTERM');
  }
});
