import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const script = await readFile(new URL('../scripts/generate-salon-poster.py', import.meta.url), 'utf8');

test('registration QR poster uses the sea fishing scene as its background source', () => {
  assert.match(
    script,
    /REGISTRATION_SOURCE\s*=\s*ASSETS\s*\/\s*["']poster-sea-fishing-background\.png["']/,
    'QR registration poster should use the sea fishing background image'
  );
});
