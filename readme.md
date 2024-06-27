<h1 align="center">plain-store</h1>
<div align="center">
  <a href="https://github.com/oe/plain-store/actions/workflows/build.yml">
    <img src="https://github.com/oe/template-to-react/actions/workflows/build.yml/badge.svg" alt="Github Workflow">
  </a>
  <a href="#readme">
    <img src="https://badges.frapsoft.com/typescript/code/typescript.svg?v=101" alt="code with typescript" height="20">
  </a>
  <a href="#readme">
    <img src="https://badge.fury.io/js/plain-store.svg" alt="npm version" height="20">
  </a>
  <a href="https://www.npmjs.com/package/plain-store">
    <img src="https://img.shields.io/npm/dm/plain-store.svg" alt="npm version" height="20">
  </a>
</div>
A dead simple immutable store for react to manage state in your application, redux alternative in less than 1kb.

## Installation
```bash
# npm
npm install plain-store
# yarn
yarn add plain-store
```

## Usage
```javascript
import { createStore, isDeepEqual, deepFreeze } from 'plain-store';

const initialState = {
  count: 0
};

const store = createStore(initialState);
store.setStore({ count: 1 });

function Counter() {
  const { count } = store.useStore();
  const doubled = store.useSelect((state) => state.count * 2);
  return (
    <div>
      <div>count: {count}</div>
      <div>doubled: {doubled}</div>
      <button onClick={() => store.setStore((prev) => ({ count: 1 + prev.count }))}>Increment</button>
    </div>
  );
}

store.getStore(); // { count: 1 }, will trigger Counter re-render
store.setStore((prev) => ({ count: 2 + prev.count })); // { count: 3 }, will trigger Counter re-render
```

## API
### createStore(initialState)
Create a store with the initial state.
```ts
import { createStore } from 'plain-store';

interface IStore<T> {
  // Get the current state of the store, none reactive, could be used anywhere.
  getStore: () => Readonly<T>;
  // Set the state of the store, could be used anywhere.
  setStore: (state: T | ((prev: T) => T)) => void;
  // react hook to get the current state of the store.
  useStore: () => Readonly<T>;
  // react hook to select a part of the state.
  useSelect: <R>(selector: (state: T) => R) => R;
}
function createStore<T>(initialState: T | (() => T)): IStore<T>;
```

Note: the store value is immutable(freezed by Object.freeze), do not mutate the store value directly or an error will be thrown.
```ts
// always use a new object to update the store value
store.setStore((prev) => ({ ...prev, newItem: 'xxx' }))
```

### isDeepEqual(a, b)
Check if two values are deeply equal.
```ts
import { isDeepEqual } from 'plain-store';
function isDeepEqual(a: any, b: any): boolean;
```

### deepFreeze(obj)
Freeze an object deeply.
```ts
import { deepFreeze } from 'plain-store';
function deepFreeze(obj: any): any;
```

## License
MIT


