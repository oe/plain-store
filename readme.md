<h1 align="center">plain-store</h1>
<div align="center">
  <a href="https://github.com/oe/plain-store/actions/workflows/build.yml">
    <img src="https://github.com/oe/plain-store/actions/workflows/build.yml/badge.svg" alt="Github Workflow">
  </a>
  <a href="#readme">
    <img src="https://img.shields.io/badge/%3C%2F%3E-typescript-blue" alt="code with typescript" height="20">
  </a>
  <a href="#readme">
    <img src="https://badge.fury.io/js/plain-store.svg" alt="npm version" height="20">
  </a>
  <a href="https://www.npmjs.com/package/plain-store">
    <img src="https://img.shields.io/npm/dm/plain-store.svg" alt="npm version" height="20">
  </a>
</div>
A small immutable store for React 18 and later. Signal like store, no reducer, no context, no provider, no HOC, no epic. React is the only runtime peer dependency.

## Installation
```bash
# npm
npm install plain-store
# yarn
yarn add plain-store

```

## Usage
using with bundler or es module
```javascript
import { createStore, isDeepEqual } from 'plain-store';

const initialState = {
  count: 0
};

const store = createStore(initialState);
store.set({ count: 1 });

function Counter() {
  const { count } = store.useStore();
  // derive a new value from the store value
  const doubled = store.useSelector((state) => state.count * 2);
  return (
    <div>
      <div>count: {count}</div>
      <div>doubled: {doubled}</div>
      <button onClick={() => store.set((prev) => ({ count: 1 + prev.count }))}>Increment</button>
    </div>
  );
}

store.get(); // { count: 1 }
store.set((prev) => ({ count: 2 + prev.count })); // { count: 3 }, will trigger Counter re-render
```

using with script tag
```html
<!-- include react -->
<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/plain-store/dist/iife/index.js"></script>
<script>
  const { createStore, isDeepEqual } = PlainStore;
  const store = createStore({ count: 0 });
  store.set({ count: 1 });
</script>
```

## API
### createStore(initialState, options?)
Create a store with the initial state.
```ts
import { createStore } from 'plain-store';

interface ICreateStoreOptions {
  /**
   * custom comparator for store value changes, default to `isDeepEqual`
   * * use it when the default comparator is not working as expected
   * * `isDeepEqual` works for most cases, but it's not perfect, you can provide a custom comparator to handle the edge cases or performance issues.
   */
  comparator?: (a: unknown, b: unknown) => boolean;
}

interface ISetStoreOptions {
  /**
   * only update the partial value of the store,
   * * the new value will be merged with the old value
   */
  partial?: boolean;
}

type ISetStoreOptionsType = boolean | ISetStoreOptions

interface IStore<T> {
  // listen to the store value changes, return a function to unsubscribe.
  subscribe: (listener: () => void) => () => void;
  // Get the current state of the store, none reactive, could be used anywhere.
  get: () => Readonly<T>;
  // Set the state of the store, could be used anywhere, callback could be async.
  // * return a promise if the params is async function
  // * use get() to get the latest state of the store when using async function
  // * use partial option to update the partial value of the store
  set: (newValue: T | ((prev: T) => (T | Promise<T>)), cfg?: ISetStoreOptionsType): void | Promise<void>
  // react hook to get the current state of the store.
  useStore: () => Readonly<T>;
  // react hook to select a part of the state.
  useSelector: <R>(selector: (state: T) => R) => Readonly<R>;
}
function createStore<T>(initialState: T | (() => T), options?: ICreateStoreOptions): IStore<T>;
```

```ts
// always use a new object to update the store value
store.set((prev) => ({ ...prev, newItem: 'xxx' }))
```

The API sketch above is simplified; the package's TypeScript overloads validate partial updates. State is treated as immutable, but is not frozen or cloned. Always replace changed objects, arrays, Maps, and Sets rather than mutating them in place.

Selectors may depend on component props and may return objects. Equal selections retain their previous reference and unrelated store changes do not cause a render. Keep selectors pure; React may evaluate them more than once.

### Server rendering

Both hooks support server rendering and hydration. The server snapshot is the initial value passed to `createStore`. Create a separate store for each request with its fully prepared initial state, and recreate it in the browser using the same serialized state. Client updates made before hydration are applied after React hydrates the initial snapshot. Avoid sharing a mutable module-level store between server requests.

### Async updates

Async setters apply their result when it resolves; they do not cancel older requests or guarantee invocation order. A rejected updater leaves the store unchanged and its returned promise rejects. Partial async updates merge with the current state at resolution time.

### isDeepEqual(a, b)
Check if two values are deeply equal. Supports primitives, objects (including null-prototype records), arrays, RegExp, Date, Map, Set, typed arrays, ArrayBuffer, and DataView. Map keys and Set members use identity equality. Cyclic values and symbol-keyed object properties are not supported; provide a custom comparator for these cases.
```ts
import { isDeepEqual } from 'plain-store';
function isDeepEqual(a: any, b: any): boolean;
```

### isPromiseLike(obj)
Check if a value is a promise

```ts
import { isPromiseLike } from 'plain-store';
function isPromiseLike(obj: any): boolean;
```

## Development

Use Node.js 24.15 or later and Yarn 1.22.22 for the development tools. This requirement does not apply to applications consuming the library.

```bash
yarn install --frozen-lockfile
yarn test
yarn build
yarn test:package
```

CI runs tests and builds against React 18 and 19, then checks the packed CommonJS, ESM, browser IIFE, and type declaration files. Use `yarn test:watch` during development.

## License
MIT

