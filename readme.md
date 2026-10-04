<h1 align="center">plain-store</h1>
<p align="center">A tiny React state store with get/set APIs and deep-equal selectors.</p>
<p align="center">
  <a href="https://github.com/oe/plain-store/actions/workflows/build.yml"><img src="https://github.com/oe/plain-store/actions/workflows/build.yml/badge.svg" alt="Build and tests"></a>
  <a href="https://www.npmjs.com/package/plain-store"><img src="https://img.shields.io/npm/v/plain-store.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/plain-store"><img src="https://img.shields.io/npm/dm/plain-store.svg" alt="Monthly downloads"></a>
</p>

Share UI state between React components and update it from ordinary JavaScript. Create a store, read it with a hook, and update it with `set` — no Provider or reducer setup.

- **Small API:** `get`, `set`, `subscribe`, `useStore`, and `useSelector`.
- **Object selectors:** deeply equal selections retain their previous reference, so unrelated store updates do not trigger a render.
- **TypeScript:** inferred state types and checked partial updates.
- **React 18+:** tested on React 18 and 19, including server rendering and hydration.
- **No extra runtime dependencies:** React is the only peer dependency. The minified CJS/browser build is approximately 1 kB gzipped, excluding React; format and build settings affect size.

ESM builds allow bundlers to remove unused exports and unused package imports. The browser IIFE contains the full library. CI enforces gzip budgets of 1,350 bytes for ESM and 1,200 bytes for CJS/IIFE, excluding React.

[Compare performance and bundle size with Zustand and Jotai](#benchmarks), including where each configuration fits.

## Installation

```bash
npm install plain-store
# or
yarn add plain-store
```

## Quick start

```tsx
import { createStore } from 'plain-store';

const counter = createStore({ count: 0 });

function Counter() {
  const count = counter.useSelector((state) => state.count);
  return (
    <button onClick={() => counter.set((state) => ({ count: state.count + 1 }))}>
      Count: {count}
    </button>
  );
}

// The same API works outside a component.
counter.set({ count: 10 });
console.log(counter.get().count); // 10
```

Use `counter.useStore()` when a component needs the entire state. It updates on every accepted store change; use a selector when the component needs a subset.

## Share filters without rerendering for unrelated changes

A selector can return an object without an extra equality helper:

```tsx
const ui = createStore({ query: '', sort: 'name', panelOpen: false });

function SearchFilters() {
  const { query, sort } = ui.useSelector((state) => ({
    query: state.query,
    sort: state.sort,
  }));

  return (
    <input
      aria-label={`Search, sorted by ${sort}`}
      value={query}
      onChange={(event) => ui.set({ query: event.target.value }, true)}
    />
  );
}

function PanelButton() {
  const open = ui.useSelector((state) => state.panelOpen);
  return (
    <button onClick={() => ui.set({ panelOpen: !open }, true)}>
      {open ? 'Close panel' : 'Open panel'}
    </button>
  );
}
```

Changing `panelOpen` does not trigger a store-driven render of `SearchFilters`: its selected `query` and `sort` are unchanged. Parent renders and local React state can still render the component. Selectors may also depend on props; keep them pure because React can evaluate them more than once.

## When to choose plain-store

Use it for shared client-side UI state when you prefer a small, explicit store object and deep equality by default. Filters, dialogs, selections, and independent React widgets are good starting points.

| Choice | When it fits |
| --- | --- |
| React `useState` / `useReducer` | State belongs to a component or can be shared by lifting it to a parent. |
| plain-store | You want `get/set/subscribe` outside React, hooks inside React, and deeply compared selectors with little setup. |
| [Zustand](https://github.com/pmndrs/zustand) | You want a similar lightweight store with an established ecosystem, persistence, and DevTools integrations. |
| [Jotai](https://github.com/pmndrs/jotai) | You prefer atoms and composed derived state. |
| [TanStack Query](https://tanstack.com/query) | You need server-data fetching, caching, synchronization, and retries. |

Zustand also works without a Provider and exposes an external store API. plain-store's default deep equality is a convenience, not a general speed advantage: comparisons cost work, especially for large values. plain-store does not provide persistence, DevTools, automatic signal dependency tracking, or request caching.

## Benchmarks

plain-store combines **built-in deep equality, suppression of deeply equal writes, and a small API**. The comparison measures these tradeoffs alongside configured alternatives; it does not establish a universal fastest library. **The current PR includes unreleased shared-selector optimizations. Published 0.10.0 is measured separately in the same process as the baseline.**

### Bundle size for equivalent object selections

Minified consumer fixtures expose a selected-state hook and a setter. Values are gzip **bytes**, excluding React and including each configuration's equality support:

| Configuration | Flat object selection | Deep object selection |
| --- | ---: | ---: |
| plain-store PR, default equality (unreleased) | 1,342 | 1,368 |
| Zustand/traditional + fast-deep-equal | 2,026 | 2,055 |
| Zustand + useShallow | 914 | — |
| Jotai + selectAtom + equality function | 3,823 | 4,432 |

The deep-selection fixture costs about **1.37 kB** for plain-store without an extra equality dependency. Zustand's shallow-only fixture is smaller; shallow equality does not handle the fresh nested objects in the deep fixture. These are fixture costs, not whole apps or package download sizes. Build settings and usage affect size.

### Update and selector costs

Snapshot from **2026-10-04**: plain-store PR (unreleased) and npm 0.10.0 baseline, Zustand 5.0.15, Jotai 3.0.1; production React/React DOM 18.3.1, Node 24.19.0, jsdom 30.1.1, Linux x64 on Intel Xeon Platinum 8573C. React cases use 20 mounted subscribers and 500 synchronous updates; lists contain 5,000 items. Times are **median milliseconds**, lower is less time, after two warmup and seven measured rounds with rotated library order:

| Workload | plain-store PR | npm 0.10.0 | Zustand | Jotai |
| --- | ---: | ---: | ---: | ---: |
| 100,000 writes, one listener, no React | 22.03 | 21.56 | 6.91 | 315.62 |
| Primitive selection, unrelated updates | 2.30 | 0.50 | 0.34 | 6.83 |
| Primitive selection, selected updates | 19.44 | 17.32 | 16.11 | 24.56 |
| Shared object selection, unrelated updates | 0.68 | 1.26 | 0.83 | 2.67 |
| Shared object selection, selected updates | 23.00 | 18.12 | 18.04 | 25.14 |
| Component-local object, unrelated updates | 2.10 | 1.39 | 0.85 | 36.41 |
| Component-local object, selected updates | 29.15 | 22.94 | 30.66 | 61.18 |
| Shared nested selection, unrelated updates | 0.83 | 3.23 | 2.34 | 2.79 |
| Shared uncached list, unrelated updates | 20.97 | 418.69 | 435.29 | 25.30 |
| Shared uncached list, filter changes each update | 35.57 | 296.36 | 292.41 | 36.09 |
| Cached list, unrelated updates | 0.78 | 0.59 | 0.39 | 2.94 |
| Cached list, filter changes each update | 29.61 | 31.87 | 32.48 | 36.04 |

The first row measures allocation of 100,000 fresh `{ count }` objects, equality checks, applying each update and invoking one listener; it includes no React rendering or selector work. With the existing `comparator: Object.is` option, the same working-tree implementation measured **8.99 ms**, compared with **22.03 ms** using default deep equality, **10.62 ms** for npm 0.10.0 with `Object.is`, and **6.91 ms** for Zustand. Reference equality removes much of this workload's comparison cost, but Zustand still has lower setter overhead. This option also changes selector and equal-write behavior; see [reference equality for frequent writes](#reference-equality-for-frequent-writes).

Zustand uses its native hook for primitives and `traditional` + fast-deep-equal for objects/arrays. The additional `useShallow` flat-object configuration measured 3.00 ms for unrelated updates and 29.46 ms for selected updates. Jotai shares one selected atom in shared cases and uses component-local atoms in local cases. All configurations skip unrelated renders. Cached-list cases give **every library the same application-level cache**.

The shared uncached-list optimization reduces filtering from **10,000 to 500 operations**. In this run, unrelated updates fell from about 419 to 21 ms, approaching Jotai's shared-atom cost. Changing the filter still renders 10,000 times in every configuration. Distinct component-local selectors do not share work and can be slower because of cache lookups; the table includes that cost. Simple or already cached selectors do not gain uniformly. The library gzip footprint grows by 98–116 bytes over 0.10.0; budgets increase by 100 bytes to preserve a small margin for builds and compatibility guards.

Default write deduplication is unchanged: 500 fresh root objects with unchanged contents produce **zero notifications and zero selector calls** in both plain-store versions, versus 500 notifications in Zustand and Jotai. Object selectors run 10,000 times in Zustand and 500 times in Jotai; none renders. This diagnostic compares different default write semantics, so it is not included in the timing table. Other libraries can add an equality guard before writing.

Zustand retains lower raw update overhead. Jotai offers native shared derivations and can model independent input atoms; that topology is outside this root-store comparison. plain-store's niche is default deep equality and write deduplication with a small footprint, now including snapshot-level sharing for identical selector functions. Small timing differences and overlapping quartiles do not establish an app-level advantage; Node/jsdom does not measure browser paint or interaction latency.

```sh
npm run benchmark:compare
# Optional destination; preserve the checked-in snapshots:
npm run benchmark:compare -- /tmp/comparison.json
```

[Methodology and adapters](benchmarks/README.md), [React 18 raw samples and counts](benchmarks/results/react-18.json), and [React 19 results](benchmarks/results/react-19.json) include versions, quartiles, source hashes and machine metadata. CI validates outputs, render/computation counts and bundled imports on React 18/19; timing rankings do not decide success. Benchmark dependencies are isolated from the published library. The PR optimizations are not in npm 0.10.0 yet.

## Large lists and frequent updates

Skipping a render does not skip selector computation. The unreleased implementation shares one calculation for the same selector function in the latest snapshot; a selector such as `state.todos.filter(...)` still scans the list on each accepted update, even when only an unrelated field changes. Separate inline functions do not share calculations. `useCallback` stabilizes a function within a component; it does not make different components' functions identical or cache derived results across changed snapshots.

For expensive derivations, cache one result by the inputs it actually uses. Create the selector once alongside its store, and share it between components that need the same result:

```ts
type Todo = { id: number; done: boolean };
type State = { todos: Todo[]; filter: 'all' | 'active' | 'done'; progress: number };

function createTodoStore(initialState: State) {
  let cached: { todos: Todo[]; filter: State['filter']; result: Todo[] } | undefined;
  const selectVisibleTodos = ({ todos, filter }: State) => {
    if (cached && cached.todos === todos && cached.filter === filter) return cached.result;
    const result = filter === 'all'
      ? todos : todos.filter((todo) => todo.done === (filter === 'done'));
    cached = { todos, filter, result };
    return result;
  };
  return { store: createStore(initialState), selectVisibleTodos };
}

const { store, selectVisibleTodos } = createTodoStore({
  todos: [{ id: 1, done: false }], filter: 'active', progress: 0,
});
// Inside a component:
// const visibleTodos = store.useSelector(selectVisibleTodos);
store.set({ progress: 1 }, true); // reuses the selected array; no filtering
store.set({ filter: 'done' }, true); // recomputes once, shared by subscribers
```

Keep every dependency in the cache key, including props if the calculation uses them. Replace changed arrays and items rather than mutating them. Do not mutate the selected array. The cache retains only the latest inputs and result; reading an older snapshot recomputes it correctly. Create a separate store and selector per server request. [The runnable recipe](demo/large-state.ts) includes these types and supports the existing comparator option.

The default comparator still works with this pattern and skips comparing a cached array's contents when its reference is unchanged. For multiple related field changes, prefer a single `set` call to notify subscribers once.

Run `npm run benchmark:selectors` to compare uncached selectors, cached selectors with default equality, and cached selectors with `Object.is`. It uses the production build with 5,000 items, 20 mounted subscribers, and 500 synchronous updates, checks output/render/computation counts, and reports medians after warmup. The benchmark also changes the filter on every update to measure the case where recomputation is necessary. Node/jsdom timings are local diagnostics, not browser performance guarantees.

## Reference equality for frequent writes

Zustand's default write check uses `Object.is`; plain-store's default deep comparison does more work to suppress updates with equal contents. For frequent immutable updates where that suppression is unnecessary, the existing comparator option selects reference equality:

```tsx
const cursor = createStore({ x: 0, y: 0 }, { comparator: Object.is });

function CursorX() {
  const x = cursor.useSelector((state) => state.x); // a primitive selection
  return <span>{x}</span>;
}

cursor.set({ x: 10, y: 20 });
```

This option applies to **both writes and selector results**. Select primitives, existing immutable references, or memoized derived values. A selector returning a fresh `{ x: state.x }` loses default deep stabilization and can cause extra renders. A fresh root object with equal contents also notifies subscribers. Replace changed values rather than mutating them; setting the same reference is ignored. Default deep equality remains the convenient choice for fresh object selections.

## API

### `createStore(initialState, options?)`

Pass a value or a synchronous initializer. Function values themselves cannot be stored as the root state; object properties may contain functions.

```ts
const count = createStore(0);
const preferences = createStore(() => ({ theme: 'light' }));
const fastCount = createStore(0, { comparator: Object.is });
```

`options.comparator(a, b)` defaults to `isDeepEqual`. The same comparator checks both whole-state updates and selector results, so it must handle both kinds of value. Choose a comparator that fits your state size and update frequency; reference comparison requires stable references for object selections.

### `store.get()`

Return the current state without subscribing. The return type is shallow `Readonly<T>`; state is not cloned or frozen.

### `store.set(valueOrUpdater, options?)`

**Replace the entire state by default.** Use `true` or `{ partial: true }` to shallow-merge an object update with the current state.

```ts
const profile = createStore({ name: 'Saiya', age: 20 });

profile.set({ name: 'Saiya', age: 21 });
profile.set({ age: 22 }, true); // preserves name
profile.set((state) => ({ age: state.age + 1 }), { partial: true });
```

Partial updates are intended for object records. Always replace changed objects, arrays, Maps, and Sets. Mutating an existing state reference can prevent updates from being detected.

An updater receives the current state and may return a Promise. The setter returns `void` for synchronous updates and a Promise for asynchronous updates.

```ts
await profile.set(async () => ({ age: await loadAge() }), true);
```

Async results apply in resolution order. Older requests are not canceled and can overwrite newer results. Partial async updates merge with the state at resolution time. A rejected updater does not apply its result; other updates may still have changed the store. Catch the returned Promise's rejection as you would for any other async operation.

### `store.useStore()`

React hook returning the whole state and subscribing to accepted changes.

### `store.useSelector(selector)`

React hook returning a selected value. Store changes trigger a render when the comparator considers that selection different. Equal selections retain their previous reference.

In the unreleased implementation, components passing the **same pure selector function object** share its computation in the store's latest selected snapshot. Use `store.useSelector(selectVisibleTodos)` to share a named selector; `store.useSelector(state => selectVisibleTodos(state))` creates a separate function. Default equality can share stabilized results, while custom comparators retain each subscriber's own comparison history. Changing selectors still recomputes correctly, and per-hook snapshot caches preserve concurrent rendering and hydration behavior.

Selectors must derive their result from the snapshot and captured props represented by their function identity. Treat selected values as immutable because references may be shared. Accepted writes clear shared results; weak function keys allow abandoned functions to be collected. The cache retains latest results while the store and keys remain alive. Reading an older snapshot may recompute it. This adds a small fixed cost to cheap/distinct selectors and provides no automatic field dependency tracking. Published 0.10.0 evaluates selectors per subscriber; these changes are pending release.

### `store.subscribe(listener)`

Subscribe outside React. The callback receives no arguments and runs after an accepted update; use `get()` to read the latest state. It is not called immediately on subscription.

```ts
const unsubscribe = profile.subscribe(() => {
  console.log(profile.get());
});
unsubscribe();
```

### `isDeepEqual(a, b)`

Exported comparator for primitives, objects, arrays, RegExp, Date, Map, Set, typed arrays, ArrayBuffer, and DataView. Null-prototype records are supported. Map keys and Set members use identity equality.

The comparator does not handle cyclic structures or compare symbol-keyed object properties. It is not a universal comparator for arbitrary class instances; custom `valueOf` and `toString` methods affect comparisons. Use a custom comparator for unsupported values.

### `isPromiseLike(value)`

Return a boolean indicating whether a value is a Promise or has a callable `then` method.

### Compatibility aliases

`getStore`, `setStore`, and `useSelect` remain available as deprecated aliases of `get`, `set`, and `useSelector`.

## Server rendering and hydration

Both hooks use the initial value passed to `createStore` as the server snapshot. Prepare your data before creating the store, create a separate store for each request, and initialize the browser store with the same serialized state.

```ts
function createPageStore(initialState: { query: string }) {
  return createStore(initialState);
}

// Server: one instance per request, after preparing the initial state.
const serverStore = createPageStore({ query: 'react' });
// Browser: recreate using the initial state serialized by the server.
const browserStore = createPageStore({ query: 'react' });
```

Pass the appropriate instance to your components using your application's props or context. Avoid sharing a mutable module-level store across server requests. Calling `set` after creation does not change the server snapshot; browser updates made before hydration apply after React hydrates that initial snapshot.

In frameworks using React Server Components, call these hooks from Client Components. Server rendering support here refers to React DOM rendering and hydration, not running hooks in Server Components.

## Browser script

For a React 18 application using UMD scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/plain-store@0.10.0/dist/iife/index.js"></script>
<script>
  const counter = PlainStore.createStore(0);
  counter.set(1);
</script>
```

Use package imports with a bundler for React 19 applications. The browser build expects React to be provided separately.

## Upgrading from 0.9.x

The store API, deprecated aliases, React >=18 peer requirement, and existing `dist/cjs/index.js`, `dist/esm/index.js`, `dist/iife/index.js`, and `dist/types/index.d.ts` paths remain available. A `.mjs` ESM entry is added for explicit native ESM imports; package-root imports continue to work.

Version 0.10.0 fixes stale selectors when props change, updates missed before subscription, interrupted-render selector handling, server rendering, and comparator edge cases. Selectors may be evaluated at different times or more often than before; they must be pure. See [the changelog](https://github.com/oe/plain-store/blob/main/CHANGELOG.md) for details.

## Development

Development tools require Node.js 24.15+ and Yarn 1.22.22. Applications consuming the package do not inherit this tooling requirement.

```bash
yarn install --frozen-lockfile
yarn test
yarn build
yarn test:package
# Optional: run the local examples or watch tests.
yarn dev
yarn test:watch
```

CI checks React 18 and 19, TypeScript, production builds, and the actual package tarball (CommonJS, ESM, browser IIFE, and declaration files), including size budgets and removal of unused imports. [Examples](https://github.com/oe/plain-store/tree/main/demo) are available in the repository. The demo timing loops are exploratory examples, not comparative performance guarantees.

## License

[MIT](https://github.com/oe/plain-store/blob/main/LICENSE)
