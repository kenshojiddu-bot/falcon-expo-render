import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/admin.html', import.meta.url), 'utf8');

test('admin page owns the complete read-only management workflow', () => {
  assert.match(html, /<meta\s+name=["']robots["'][^>]*noindex/i);
  for (const id of [
    'loginForm',
    'password',
    'adminShell',
    'totalCount',
    'expoCount',
    'salonCount',
    'searchInput',
    'refreshButton',
    'exportButton',
    'logoutButton',
    'recordsBody',
    'recordsList',
    'detailDialog'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `admin page should contain #${id}`);
  }
  for (const type of ['all', 'expo', 'salon']) {
    assert.match(html, new RegExp(`data-type=["']${type}["']`), `admin page should contain ${type} filter`);
  }
});

test('admin client uses protected APIs and never embeds the password', () => {
  assert.match(html, /fetch\(['"]\/api\/admin\/login/);
  assert.match(html, /fetch\(['"]\/api\/admin\/submissions/);
  assert.match(html, /fetch\(['"]\/api\/admin\/logout/);
  assert.match(html, /text\/csv/);
  assert.match(html, /showModal\(\)/);
  assert.doesNotMatch(html, /id=["']password["'][^>]*\svalue=/i);
  assert.doesNotMatch(html, /ADMIN_PASSWORD/);
});
