import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createStore } from '../src';

afterEach(cleanup);

describe('shared selector computations', () => {
  it('shares derivation and deeply equal results across subscribers', () => {
    const store = createStore({ items: [1, 2, 3], other: 0 });
    const select = vi.fn((state: { items: number[] }) => ({
      items: state.items.filter((value) => value % 2),
    }));
    let renders = 0;
    const first = renderHook(() => {
      renders++;
      return store.useSelector(select);
    });
    const second = renderHook(() => store.useSelector(select));
    const initial = first.result.current;
    expect(select).toHaveBeenCalledTimes(1);
    expect(second.result.current).toBe(initial);
    act(() => store.set({ other: 1 }, true));
    expect(select).toHaveBeenCalledTimes(2);
    expect(first.result.current).toBe(initial);
    expect(second.result.current).toBe(initial);
    expect(renders).toBe(1);
    act(() => store.set({ items: [5, 6] }, true));
    expect(select).toHaveBeenCalledTimes(3);
    expect(first.result.current).toEqual({ items: [5] });
    expect(second.result.current).toBe(first.result.current);
  });

  it('keeps each subscriber history for a custom non-transitive comparator', () => {
    const comparator = (a: unknown, b: unknown) => typeof a === 'number' && typeof b === 'number'
      ? Math.abs(a - b) < 3 : Object.is(a, b);
    const store = createStore({ value: 0 }, { comparator });
    const select = vi.fn((state: { value: number }) => state.value);
    const first = renderHook(() => store.useSelector(select));
    act(() => store.set({ value: 2 }));
    expect(first.result.current).toBe(0);
    const second = renderHook(() => store.useSelector(select));
    expect(second.result.current).toBe(2);
    act(() => store.set({ value: 4 }));
    expect(first.result.current).toBe(4);
    expect(second.result.current).toBe(2);
    expect(select).toHaveBeenCalledTimes(3);
  });

  it('does not publish a value retained from a different selector to new subscribers', () => {
    const boxed = new Number(1);
    const store = createStore({ boxed, value: 1, other: 0 });
    const selectBox = (state: { boxed: Number }) => state.boxed;
    const selectNumber = (state: { value: number }) => state.value;
    const first = renderHook(({ useBox }) => store.useSelector<Number | number>(useBox ? selectBox : selectNumber),
      { initialProps: { useBox: true } });
    first.rerender({ useBox: false });
    expect(first.result.current).toBe(boxed); // Existing per-hook equality behavior.
    const second = renderHook(() => store.useSelector(selectNumber));
    expect(second.result.current).toBe(1);
    act(() => store.set({ other: 1 }, true));
    expect(first.result.current).toBe(boxed);
    const third = renderHook(() => store.useSelector(selectNumber));
    expect(second.result.current).toBe(1);
    expect(third.result.current).toBe(1);
    act(() => store.set({ value: 2 }, true));
    expect(first.result.current).toBe(2);
    expect(second.result.current).toBe(2);
    expect(third.result.current).toBe(2);
  });

  it('shares undefined results and invalidates after updates without subscribers', () => {
    const store = createStore({ count: 0 });
    const select = vi.fn((_state: { count: number }) => undefined);
    const first = renderHook(() => store.useSelector(select));
    const second = renderHook(() => store.useSelector(select));
    expect(select).toHaveBeenCalledTimes(1);
    first.unmount();
    second.unmount();
    store.set({ count: 1 });
    const third = renderHook(() => store.useSelector(select));
    expect(third.result.current).toBeUndefined();
    expect(select).toHaveBeenCalledTimes(2);
    expect(select).toHaveBeenLastCalledWith({ count: 1 });
  });

  it('isolates different selectors and different stores using the same state reference', () => {
    const state = { count: 1, other: 2 };
    const first = createStore(state);
    const second = createStore(state);
    const count = vi.fn((state: { count: number }) => state.count);
    const one = renderHook(() => first.useSelector(count));
    const two = renderHook(() => second.useSelector(count));
    const other = renderHook(() => first.useSelector((state) => state.other));
    expect(count).toHaveBeenCalledTimes(2);
    act(() => first.set({ count: 3 }, true));
    expect(one.result.current).toBe(3);
    expect(two.result.current).toBe(1);
    expect(other.result.current).toBe(2);
  });

  it('does not replace a mounted client selection while another root hydrates an older snapshot', async () => {
    const store = createStore({ count: 1 });
    const select = (state: { count: number }) => ({ count: state.count });
    function Selected() { return <span>{store.useSelector(select).count}</span>; }
    const hydrating = document.createElement('div');
    hydrating.innerHTML = renderToString(<Selected />);
    store.set({ count: 2 });
    const live = document.createElement('div');
    const liveRoot = createRoot(live);
    act(() => liveRoot.render(<Selected />));
    const errors: unknown[] = [];
    let hydrationRoot!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      hydrationRoot = hydrateRoot(hydrating, <Selected />, { onRecoverableError: (error) => errors.push(error) });
    });
    try {
      expect(errors).toEqual([]);
      expect(live.textContent).toBe('2');
      expect(hydrating.textContent).toBe('2');
      act(() => store.set({ count: 3 }));
      expect(live.textContent).toBe('3');
      expect(hydrating.textContent).toBe('3');
    } finally {
      act(() => { liveRoot.unmount(); hydrationRoot.unmount(); });
    }
  });

  it('keeps synchronous reentrant notification ordering', () => {
    const store = createStore(0);
    const notifications: string[] = [];
    store.subscribe(() => {
      notifications.push(`first:${store.get()}`);
      if (store.get() === 1) store.set(2);
    });
    store.subscribe(() => notifications.push(`second:${store.get()}`));
    store.set(1);
    expect(notifications).toEqual(['first:1', 'first:2', 'second:2', 'second:2']);
  });
});
