import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, Suspense, startTransition, useLayoutEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createStore, isDeepEqual, isPromiseLike } from '../src';

afterEach(cleanup);

describe('store regressions', () => {
  it('recomputes a selector when its props change without a store update', () => {
    const store = createStore({ a: 1, b: 2 });
    const { result, rerender } = renderHook(
      ({ key }: { key: 'a' | 'b' }) => store.useSelector((state) => state[key]),
      { initialProps: { key: 'a' as 'a' | 'b' } },
    );
    expect(result.current).toBe(1);
    rerender({ key: 'b' });
    expect(result.current).toBe(2);
    act(() => store.set({ a: 3, b: 4 }));
    expect(result.current).toBe(4);
  });

  it('catches updates between render and subscription', () => {
    const store = createStore(0);
    const { result } = renderHook(() => {
      useLayoutEffect(() => { store.set(1); }, []);
      return store.useSelector((value) => ({ value }));
    });
    expect(result.current).toEqual({ value: 1 });
  });

  it('retains equal object selections and skips unrelated renders', () => {
    const store = createStore({ count: 0, other: 0 });
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders++;
      return store.useSelector((state) => ({ count: state.count }));
    });
    const selected = result.current;
    act(() => store.set({ other: 1 }, true));
    expect(renders).toBe(1);
    expect(result.current).toBe(selected);
    rerender();
    expect(result.current).toBe(selected);
    act(() => store.set({ count: 1 }, true));
    expect(result.current).toEqual({ count: 1 });
  });

  it('renders both hooks on the server', () => {
    const store = createStore({ count: 2 });
    function Counter() {
      const state = store.useStore();
      const doubled = store.useSelector((state) => state.count * 2);
      return <span>{state.count}:{doubled}</span>;
    }
    expect(renderToString(<Counter />)).toBe('<span>2<!-- -->:<!-- -->4</span>');
  });

  it('hydrates the initial snapshot before applying client updates', async () => {
    const store = createStore({ count: 2 });
    function Counter() {
      const state = store.useStore();
      const selected = store.useSelector((state) => ({ count: state.count }));
      return <span>{state.count + selected.count}</span>;
    }
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Counter />);
    store.set({ count: 3 });
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <Counter />, { onRecoverableError: (error) => errors.push(error) });
    });
    try {
      expect(errors).toEqual([]);
      expect(container.textContent).toBe('6');
    } finally {
      act(() => root!.unmount());
    }
  });

  it('keeps the committed selector when a different selector suspends', async () => {
    const store = createStore({ a: 1, b: 2 });
    const pending = new Promise<void>(() => {});
    let changeKey!: (key: 'a' | 'b') => void;
    function Counter() {
      const [key, setKey] = useState<'a' | 'b'>('a');
      changeKey = setKey;
      const value = store.useSelector((state) => state[key]);
      if (key === 'b') throw pending;
      return <span>{value}</span>;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(<StrictMode><Suspense fallback="loading"><Counter /></Suspense></StrictMode>);
    });
    try {
      await act(async () => { startTransition(() => changeKey('b')); });
      expect(container.textContent).toBe('1');
      act(() => { store.set({ a: 3, b: 2 }); });
      expect(container.textContent).toBe('3');
    } finally {
      act(() => root.unmount());
    }
  });
});

describe('comparator regressions', () => {
  it('compares null-prototype records without throwing', () => {
    const a = Object.assign(Object.create(null), { count: 1 });
    const b = Object.assign(Object.create(null), { count: 2 });
    expect(isDeepEqual(a, a)).toBe(true);
    expect(isDeepEqual(a, Object.assign(Object.create(null), { count: 1 }))).toBe(true);
    expect(isDeepEqual(a, b)).toBe(false);
  });

  it('compares DataView contents, lengths, and offsets', () => {
    const bytes = new Uint8Array([9, 1, 2, 3]);
    expect(isDeepEqual(new DataView(bytes.buffer, 1, 2), new DataView(new Uint8Array([1, 2]).buffer))).toBe(true);
    expect(isDeepEqual(new DataView(bytes.buffer, 1, 2), new DataView(bytes.buffer, 2, 2))).toBe(false);
    expect(isDeepEqual(new DataView(bytes.buffer, 1, 2), new DataView(bytes.buffer, 1, 3))).toBe(false);
  });

  it('compares ArrayBuffer contents', () => {
    expect(isDeepEqual(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 2]).buffer)).toBe(true);
    expect(isDeepEqual(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 3]).buffer)).toBe(false);
    expect(isDeepEqual(new ArrayBuffer(1), new ArrayBuffer(2))).toBe(false);
  });

  it('returns a boolean when checking nullish and falsy values for promises', () => {
    for (const value of [null, undefined, 0, false, '']) {
      expect(isPromiseLike(value)).toBe(false);
    }
    expect(isPromiseLike(Promise.resolve(1))).toBe(true);
    expect(isPromiseLike({ then: () => {} })).toBe(true);
  });
});
