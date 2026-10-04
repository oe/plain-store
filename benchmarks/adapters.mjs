import { createStore as createPlainStore } from '../dist/esm/index.mjs';
import { createStore as createZustandStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { atom, createStore as createJotaiStore, useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import deepEqual from 'fast-deep-equal';

export const adapters = [
  {
    name: 'plain-store',
    create(initial, select) {
      const store = createPlainStore(initial);
      return {
        get: store.get,
        set: store.set,
        subscribe: store.subscribe,
        useSelection: () => store.useSelector(select),
      };
    },
  },
  {
    name: 'Zustand',
    create(initial, select, kind) {
      const store = createZustandStore(() => initial);
      return {
        get: store.getState,
        set: (next) => store.setState(next, true), // full replacement, like plain-store
        subscribe: store.subscribe,
        useSelection: kind === 'primitive'
          ? () => useZustandStore(store, select)
          : () => useStoreWithEqualityFn(store, select, deepEqual),
      };
    },
  },
  {
    name: 'Jotai',
    create(initial, select) {
      const store = createJotaiStore();
      const state = atom(initial);
      // One shared selected atom is idiomatic: let Jotai share computations.
      const selected = selectAtom(state, select, deepEqual);
      return {
        get: () => store.get(state),
        set: (next) => store.set(state, next),
        subscribe: (callback) => store.sub(state, callback),
        useSelection: () => useAtomValue(selected, { store }),
      };
    },
  },
  {
    name: 'Zustand/useShallow',
    flatOnly: true,
    create(initial, select) {
      const store = createZustandStore(() => initial);
      return {
        get: store.getState,
        set: (next) => store.setState(next, true),
        subscribe: store.subscribe,
        useSelection: () => useZustandStore(store, useShallow(select)),
      };
    },
  },
];
