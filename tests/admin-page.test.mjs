import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

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

test('admin CSV export neutralizes spreadsheet formulas', () => {
  const csvCellSource = html.match(/function csvCell\(value\) \{[\s\S]*?\n    \}/)?.[0];
  assert.ok(csvCellSource, 'admin page should define csvCell');
  const context = { result: null };
  vm.runInNewContext(
    `${csvCellSource}; result = ['=SUM(1,1)', '+cmd', '-2+3', '@link', 'normal'].map(csvCell);`,
    context
  );
  assert.deepEqual(Array.from(context.result), [
    '"\'=SUM(1,1)"',
    '"\'+cmd"',
    '"\'-2+3"',
    '"\'@link"',
    '"normal"'
  ]);
});
