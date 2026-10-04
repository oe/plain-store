import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createStore } from '../dist/esm/index.mjs';
import { createVisibleTodoSelector } from '../demo/large-state.ts';

// Restart before loading hooks in production mode; timings are never CI gates.
if (process.env.NODE_ENV !== 'production') {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [...process.execArgv, import.meta.filename], {
    env: { ...process.env, NODE_ENV: 'production' }, stdio: 'inherit',
  });
  process.exit(0);
}
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { createElement, Fragment } = await import('react');
const { createRoot } = await import('react-dom/client');
const { flushSync } = await import('react-dom');

const subscribers = 20, updates = 500, items = 5000;
const todos = Array.from({ length: items }, (_, id) => ({ id, done: id % 2 === 0 }));
const cases = ['uncached/default', 'cached/default', 'cached/Object.is'];
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

function sample(name, related) {
  const derive = name.startsWith('uncached')
    ? ({ todos, filter }) => todos.filter((todo) => todo.done === (filter === 'done'))
    : createVisibleTodoSelector();
  let selections = 0, derivations = 0, renders = 0, lastSelected;
  // Count actual filtering work without changing the selector implementation.
  const countingTodos = [...todos];
  Object.defineProperty(countingTodos, 'filter', { value(...args) {
    derivations++;
    return Array.prototype.filter.apply(this, args);
  } });
  const store = createStore({ todos: countingTodos, filter: 'active', progress: 0 },
    name.endsWith('Object.is') ? { comparator: Object.is } : undefined);
  const select = (state) => { selections++; return derive(state); };
  function Observer() {
    const value = store.useSelector(select);
    lastSelected = value;
    renders++;
    return createElement('span', null, value.length);
  }
  const root = createRoot(document.createElement('div'));
  flushSync(() => root.render(createElement(Fragment, null,
    Array.from({ length: subscribers }, (_, key) => createElement(Observer, { key })))));
  selections = derivations = renders = 0;
  const start = performance.now();
  for (let progress = 1; progress <= updates; progress++) {
    flushSync(() => store.set({ progress, ...(related
      ? { filter: progress % 2 ? 'done' : 'active' } : {}) }, true));
  }
  const ms = performance.now() - start;
  assert.equal(selections, subscribers * updates);
  assert.equal(derivations, name.startsWith('uncached') ? subscribers * updates : related ? updates : 0);
  assert.equal(renders, related ? subscribers * updates : 0);
  assert.deepEqual(lastSelected, todos.filter((todo) => !todo.done));
  flushSync(() => root.unmount());
  return { ms, selections, derivations, renders };
}

console.log(JSON.stringify({ node: process.version, react: (await import('react')).version,
  subscribers, updates, items, mode: 'production', environment: 'jsdom', measuredRounds: 5 }));
for (const related of [false, true]) {
  const results = Object.fromEntries(cases.map((name) => [name, []]));
  for (let round = 0; round < 7; round++) {
    for (const name of round % 2 ? [...cases].reverse() : cases) {
      const result = sample(name, related);
      if (round >= 2) results[name].push(result);
    }
  }
  console.log(JSON.stringify({ workload: related ? 'filter changes on every update' : 'unrelated progress updates',
    results: Object.fromEntries(cases.map((name) => [name, {
      medianMs: +median(results[name].map((row) => row.ms)).toFixed(2),
      ...Object.fromEntries(['selections', 'derivations', 'renders'].map((key) => [key, results[name][0][key]])),
    }])) }));
}
dom.window.close();
