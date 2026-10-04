import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch } from 'node:os';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

if (process.env.NODE_ENV !== 'production') {
  execFileSync(process.execPath, [import.meta.filename, ...process.argv.slice(2)], {
    env: { ...process.env, NODE_ENV: 'production' }, stdio: 'inherit',
  });
  process.exit(0);
}
const rootDir = resolve(dirname(import.meta.filename), '..');
const { JSDOM } = await import('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { flushSync } = await import('react-dom');
const { adapters } = await import('./adapters.mjs');

// Separate benchmark dependencies must use the consumer's single React instance.
const require = createRequire(import.meta.url);
const rootRequire = createRequire(resolve(rootDir, 'package.json'));
assert.equal(require.resolve('react'), rootRequire.resolve('react'));
const checking = process.argv.includes('--check');
const config = { subscribers: 20, updates: checking ? 20 : 500, items: 5000,
  setters: checking ? 1000 : 100000, warmup: checking ? 0 : 2, rounds: checking ? 1 : 7 };
const todos = Array.from({ length: config.items }, (_, id) => ({ id, done: id % 2 === 0 }));
const initial = () => ({ count: 0, other: 0, query: '', filter: 'active', todos });
const flat = (state) => ({ count: state.count });
const nested = (state) => ({ filters: { query: state.query }, picks: [state.count, 42] });
const derive = ({ todos, filter }) => todos.filter((todo) => todo.done === (filter === 'done'));
const workloads = [
  { id: 'primitive/unrelated', kind: 'primitive', select: (s) => s.count, next: (s, i) => ({ ...s, other: i }), renders: 0 },
  { id: 'primitive/selected', kind: 'primitive', select: (s) => s.count, next: (s, i) => ({ ...s, count: i }), renders: config.updates * config.subscribers },
  { id: 'object/unrelated', kind: 'flat', select: flat, next: (s, i) => ({ ...s, other: i }), renders: 0 },
  { id: 'object/selected', kind: 'flat', select: flat, next: (s, i) => ({ ...s, count: i }), renders: config.updates * config.subscribers },
  { id: 'local-object/unrelated', kind: 'local', select: flat, next: (s, i) => ({ ...s, other: i }), renders: 0 },
  { id: 'local-object/selected', kind: 'local', select: flat, next: (s, i) => ({ ...s, count: i }), renders: config.updates * config.subscribers },
  { id: 'nested/unrelated', kind: 'deep', select: nested, next: (s, i) => ({ ...s, other: i }), renders: 0 },
  { id: 'derived/unrelated', kind: 'deep', select: derive, next: (s, i) => ({ ...s, other: i }), renders: 0 },
  { id: 'derived/selected', kind: 'deep', select: derive, next: (s, i) => ({ ...s, filter: i % 2 ? 'done' : 'active' }), renders: config.updates * config.subscribers },
  { id: 'cached/unrelated', kind: 'deep', select: derive, cached: true, next: (s, i) => ({ ...s, other: i }), renders: 0 },
  { id: 'cached/selected', kind: 'deep', select: derive, cached: true, next: (s, i) => ({ ...s, filter: i % 2 ? 'done' : 'active' }), renders: config.updates * config.subscribers },
  // Identical writes expose different default store semantics; not equal work.
  { id: 'equal-write/notifications', kind: 'flat', select: flat, next: (s) => ({ ...s }), renders: 0 },
];

async function sample(adapter, workload) {
  let selections = 0, derivations = 0, renders = 0, notifications = 0;
  const state = initial();
  const countingTodos = [...todos];
  Object.defineProperty(countingTodos, 'filter', { value(...args) {
    derivations++;
    return Array.prototype.filter.apply(this, args);
  } });
  state.todos = countingTodos;
  let cached;
  const select = (state) => {
    selections++;
    if (workload.cached && cached?.todos === state.todos && cached.filter === state.filter) return cached.result;
    const result = workload.select(state);
    if (workload.cached) cached = { todos: state.todos, filter: state.filter, result };
    return result;
  };
  const store = adapter.create(state, select, workload.kind);
  const unsubscribe = store.subscribe(() => notifications++);
  const observed = [];
  function Observer({ index }) {
    const value = store.useSelection();
    observed[index] = value;
    renders++;
    const label = Array.isArray(value) ? `${value.length}:${value[0]?.id}` : JSON.stringify(value);
    return React.createElement('span', null, label);
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  flushSync(() => root.render(React.createElement(React.Fragment, null,
    Array.from({ length: config.subscribers }, (_, index) => React.createElement(Observer, { index, key: index })))));
  // Drain mount effects before resetting counters (Jotai checks its subscription).
  await new Promise((resolve) => setImmediate(resolve));
  flushSync(() => {});
  selections = derivations = renders = notifications = 0;
  const start = performance.now();
  for (let i = 1; i <= config.updates; i++) {
    flushSync(() => store.set(workload.next(store.get(), i)));
  }
  const ms = performance.now() - start;
  const metrics = { ms, selections, derivations, renders, notifications };
  const finalState = store.get();
  assert.equal(finalState.other, workload.id.endsWith('/unrelated') ? config.updates : 0);
  assert.equal(finalState.count, ['object/selected', 'primitive/selected', 'local-object/selected'].includes(workload.id) ? config.updates : 0);
  assert.equal(finalState.filter, 'active');
  for (const value of observed) assert.deepEqual(value, workload.select(finalState));
  assert.equal(container.children.length, config.subscribers);
  assert.equal(renders, workload.renders, `${adapter.name} ${workload.id}: render count`);
  assert.equal(notifications, workload.id.startsWith('equal-write') && adapter.deepWrites ? 0 : config.updates);
  if (workload.cached) assert.equal(metrics.derivations, workload.id.endsWith('/selected') ? config.updates : 0);
  flushSync(() => root.unmount());
  unsubscribe();
  return metrics;
}

function setters(adapter) {
  const store = adapter.create({ count: 0 }, flat, 'flat');
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  const start = performance.now();
  for (let count = 1; count <= config.setters; count++) store.set({ count });
  const ms = performance.now() - start;
  assert.equal(store.get().count, config.setters);
  assert.equal(notifications, config.setters);
  unsubscribe();
  return { ms, notifications, selections: 0, derivations: 0, renders: 0 };
}

const quantile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * fraction)];
const results = [];
for (const workload of [{ id: 'vanilla/setters' }, ...workloads]) {
  const participants = adapters.filter((adapter) =>
    (!adapter.vanillaOnly || workload.id === 'vanilla/setters') &&
    (!adapter.flatOnly || workload.kind === 'flat'));
  const samples = Object.fromEntries(participants.map(({ name }) => [name, []]));
  for (let round = 0; round < config.warmup + config.rounds; round++) {
    // Rotate and reverse order so no library always gets the warmed environment.
    const order = [...participants.slice(round % participants.length), ...participants.slice(0, round % participants.length)];
    if (round % 2) order.reverse();
    for (const adapter of order) {
      const metrics = workload.id === 'vanilla/setters' ? setters(adapter) : await sample(adapter, workload);
      if (round >= config.warmup) samples[adapter.name].push(metrics);
    }
  }
  const row = { workload: workload.id, results: Object.fromEntries(participants.map(({ name }) => {
    const rows = samples[name], ms = rows.map((r) => r.ms);
    for (const r of rows) for (const key of ['selections', 'derivations', 'renders', 'notifications']) assert.equal(r[key], rows[0][key]);
    return [name, { medianMs: +quantile(ms, 0.5).toFixed(3), q1Ms: +quantile(ms, 0.25).toFixed(3),
      q3Ms: +quantile(ms, 0.75).toFixed(3),
      ...Object.fromEntries(['selections', 'derivations', 'renders', 'notifications'].map((key) => [key, rows[0][key]])),
      samplesMs: ms }];
  })) };
  results.push(row);
  if (!checking) console.log(JSON.stringify(row, (key, value) => key === 'samplesMs' ? undefined : value));
}

const { measureBundles } = await import('./size.mjs');
const bundles = await measureBundles();
if (checking) {
  console.log('All comparison adapters, workloads, outputs, counts and bundle imports verified. Timings are not pass/fail criteria.');
  dom.window.close();
  process.exit(0);
}
const version = (name) => require(`${name}/package.json`).version;
const hashedPaths = ['benchmarks/compare.mjs', 'benchmarks/adapters.mjs', 'benchmarks/size.mjs',
  'benchmarks/package-lock.json', 'dist/esm/index.mjs'];
const output = {
  metadata: {
    date: new Date().toISOString(), node: process.version, react: React.version,
    reactDOM: rootRequire('react-dom/package.json').version,
    libraries: { 'plain-store': rootRequire('./package.json').version, Zustand: version('zustand'), Jotai: version('jotai'),
      'plain-store 0.10.0': version('plain-store'),
      'fast-deep-equal': version('fast-deep-equal'), 'use-sync-external-store': version('use-sync-external-store') },
    platform: platform(), arch: arch(), cpu: cpus()[0].model, logicalCPUs: cpus().length,
    sources: { 'plain-store': 'working tree (unreleased)', 'plain-store 0.10.0': 'npm release',
      'plain-store/Object.is': 'working tree (unreleased), reference equality',
      'plain-store 0.10.0/Object.is': 'npm release, reference equality' },
    mode: 'production', environment: 'jsdom', jsdom: version('jsdom'), vite: version('vite'), config,
    gitRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim(),
    sourceHashes: Object.fromEntries(hashedPaths.map((path) => [path, createHash('sha256').update(readFileSync(resolve(rootDir, path))).digest('hex')])),
  }, bundles, results,
};
const outputPath = process.argv[2] ? resolve(process.argv[2])
  : resolve(rootDir, `benchmarks/results/react-${React.version.split('.')[0]}.json`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ bundles, saved: outputPath }));
dom.window.close();
