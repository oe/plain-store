import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

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
    ['module', "import { createStore } from 'plain-store/dist/esm/index.mjs';"],
    ['module', "import PlainStore from 'plain-store'; const { createStore } = PlainStore;"],
    ['commonjs', "const { createStore } = require('plain-store/dist/cjs/index.js');"],
    ['commonjs', "const { createStore } = require('plain-store/dist/cjs/index');"],
    ['commonjs', "const { createStore } = require('plain-store/dist/cjs');"],
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
  assert.equal(
    readFileSync(join(temporary, 'package/dist/esm/index.js'), 'utf8'),
    readFileSync(join(temporary, 'package/dist/esm/index.mjs'), 'utf8'),
  );
  for (const [path, budget] of [
    ['dist/esm/index.mjs', 1250],
    ['dist/cjs/index.js', 1100],
    ['dist/iife/index.js', 1100],
  ]) {
    const size = gzipSync(readFileSync(join(temporary, 'package', path))).length;
    assert.ok(size <= budget, `${path}: ${size} gzip bytes exceeds the ${budget}-byte budget`);
    console.log(`${path}: ${size}/${budget} gzip bytes (React excluded)`);
  }

  const application = join(temporary, 'unused.mjs');
  writeFileSync(application, "import { createStore } from 'plain-store'; console.log('app');");
  const bundled = await build({
    configFile: false,
    root: temporary,
    logLevel: 'silent',
    build: {
      write: false,
      rollupOptions: { input: application, external: ['react'] },
    },
  });
  for (const output of (Array.isArray(bundled) ? bundled : [bundled])) {
    const chunks = output.output.filter((item) => item.type === 'chunk');
    assert.equal(chunks.length, 1);
    assert.deepEqual(chunks[0].imports, [], 'Unused plain-store import must not retain React');
  }
  writeFileSync(application, "import 'plain-store/dist/iife/index.js'; console.log('app');");
  const browserBundle = await build({
    configFile: false,
    root: temporary,
    logLevel: 'silent',
    build: { write: false, rollupOptions: { input: application } },
  });
  const browserOutputs = Array.isArray(browserBundle) ? browserBundle : [browserBundle];
  assert.ok(browserOutputs.some((output) => output.output.some((item) =>
    item.type === 'chunk' && item.code.includes('createStore')
  )), 'The IIFE initialization must be retained when imported for side effects');
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
  console.log('Packed imports, type declarations, size budgets, and unused-import tree shaking verified.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
