<h1 align="center">plain-store</h1>
<div align="center">
  <a href="https://github.com/oe/plain-store/actions/workflows/build.yml">
    <img src="https://github.com/oe/template-to-react/actions/workflows/build.yml/badge.svg" alt="Github Workflow">
  </a>
  <a href="#readme">
    <img src="https://img.shields.io/badge/%3C%2F%3E-typescript-blue" alt="code with typescript" height="20">
  </a>
  <a href="#readme">
    <img src="https://img.shields.io/badge/coverage-100%25-44CC11" alt="code coverage" height="20">
  </a>
  <a href="#readme">
    <img src="https://badge.fury.io/js/plain-store.svg" alt="npm version" height="20">
  </a>
  <a href="https://www.npmjs.com/package/plain-store">
    <img src="https://img.shields.io/npm/dm/plain-store.svg" alt="npm version" height="20">
  </a>
</div>
A dead simple immutable store for react to manage state in your application, redux alternative in less than 1kb gzipped. Signal like store, no reducer, no context, no provider, no HOC, no epic.

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
<script src="https://cdn.jsdelivr.net/npm/react/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/plain-store/dist/index.iife.js"></script>
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

interface ICreateStoreOptions<T> {
  /**
   * custom comparator for store value changes, default to `isDeepEqual`
   * * use it when the default comparator is not working as expected
   * * `isDeepEqual` works for most cases, but it's not perfect, you can provide a custom comparator to handle the edge cases or performance issues.
   */
  comparator?: (a: any, b: any) => boolean;
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
  // * use getStore() to get the latest state of the store when using async function
  // * use partial option to update the partial value of the store
  set: (newValue: T | ((prev: T) => (T | Promise<T>)), cfg?: ISetStoreOptionsType): void | Promise<void>
  // react hook to get the current state of the store.
  useStore: () => Readonly<T>;
  // react hook to select a part of the state.
  useSelector: <R>(selector: (state: T) => R) => Readonly<R>;
}
function createStore<T>(initialState: T | (() => T), options?: ICreateStoreOptions<T>): IStore<T>;
```

```ts
// always use a new object to update the store value
store.set((prev) => ({ ...prev, newItem: 'xxx' }))
```

### isDeepEqual(a, b)
Check if two values are deeply equal, can efficiently compare common data structures like objects, arrays, regexp, date and primitives.
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

## License
MIT


