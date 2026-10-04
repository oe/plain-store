import { createStore as createPlainStore } from '../dist/esm/index.mjs';
import { createStore as createBaselineStore } from 'plain-store/dist/esm/index.mjs';
import { useMemo } from 'react';
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
    deepWrites: true,
    create(initial, select, kind) {
      const store = createPlainStore(initial);
      return {
        get: store.get,
        set: store.set,
        subscribe: store.subscribe,
        useSelection: kind === 'local'
          ? () => store.useSelector((state) => select(state))
          : () => store.useSelector(select),
      };
    },
  },
  {
    name: 'plain-store 0.10.0',
    deepWrites: true,
    create(initial, select, kind) {
      const store = createBaselineStore(initial);
      return {
        get: store.get,
        set: store.set,
        subscribe: store.subscribe,
        useSelection: kind === 'local'
          ? () => store.useSelector((state) => select(state))
          : () => store.useSelector(select),
      };
    },
  },
  {
    name: 'plain-store/Object.is',
    vanillaOnly: true,
    create(initial) {
      return createPlainStore(initial, { comparator: Object.is });
    },
  },
  {
    name: 'plain-store 0.10.0/Object.is',
    vanillaOnly: true,
    create(initial) {
      return createBaselineStore(initial, { comparator: Object.is });
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
        useSelection: kind === 'local'
          ? () => useStoreWithEqualityFn(store, (state) => select(state), deepEqual)
          : kind === 'primitive'
          ? () => useZustandStore(store, select)
          : () => useStoreWithEqualityFn(store, select, deepEqual),
      };
    },
  },
  {
    name: 'Jotai',
    create(initial, select, kind) {
      const store = createJotaiStore();
      const state = atom(initial);
      // One shared selected atom is idiomatic: let Jotai share computations.
      const selected = selectAtom(state, select, deepEqual);
      return {
        get: () => store.get(state),
        set: (next) => store.set(state, next),
        subscribe: (callback) => store.sub(state, callback),
        useSelection: kind === 'local' ? () => {
          const local = useMemo(() => selectAtom(state, (value) => select(value), deepEqual), [select]);
          return useAtomValue(local, { store });
        } : () => useAtomValue(selected, { store }),
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
