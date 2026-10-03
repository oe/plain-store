import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const temporary = mkdtempSync(join(tmpdir(), 'plain-store-package-'));
try {
  const [packed] = JSON.parse(execFileSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', temporary,
  ], { encoding: 'utf8' }));
  execFileSync('tar', ['-xzf', join(temporary, packed.filename), '-C', temporary]);
  const modules = join(temporary, 'node_modules');
  mkdirSync(modules);
  symlinkSync(join(temporary, 'package'), join(modules, 'plain-store'), 'dir');
  symlinkSync(dirname(require.resolve('react/package.json')), join(modules, 'react'), 'dir');

  for (const [format, load] of [
    ['commonjs', "const { createStore } = require('plain-store');"],
    ['module', "import { createStore } from 'plain-store';"],
  ]) {
    execFileSync(process.execPath, [`--input-type=${format}`, '--eval', `${load}
      const store = createStore(1);
      store.set(2);
      if (store.get() !== 2) throw new Error('Packaged store update failed');
    `], { cwd: temporary, stdio: 'inherit' });
  }

  const browser = { React: require('react') };
  runInNewContext(readFileSync(join(temporary, 'package/dist/iife/index.js'), 'utf8'), browser);
  assert.equal(browser.PlainStore.createStore(3).get(), 3);
  assert.ok(packed.files.some(({ path }) => path === 'dist/types/index.d.ts'));
  for (const extension of ['mts', 'cts']) {
    writeFileSync(join(temporary, `consumer.${extension}`), `
      import { createStore } from 'plain-store';
      const store = createStore({ count: 0, name: 'counter' });
      store.set({ count: 1 }, true);
      const count: number = store.get().count;
      // @ts-expect-error Invalid partial update must be rejected.
      store.set({ count: 'invalid' }, true);
    `);
  }
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext',
    '--target', 'ES2020', 'consumer.mts', 'consumer.cts',
  ], { cwd: temporary, stdio: 'inherit' });
  console.log('Packed CommonJS, ESM, IIFE, and type declarations verified.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
