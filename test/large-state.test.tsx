import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { StrictMode, Suspense, startTransition, useState } from 'react';
import { createTodoStore, createVisibleTodoSelector, type TodoState } from '../demo/large-state';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const initialState = (): TodoState => ({
  todos: [{ id: 1, done: false }, { id: 2, done: true }],
  filter: 'active',
  progress: 0,
});

describe('large-state recipe', () => {
  it.each([undefined, { comparator: Object.is }])(
    'shares derivation work across subscribers and skips unrelated updates (%j)',
    (options) => {
      const state = initialState();
      const filter = vi.spyOn(state.todos, 'filter');
      const { store, selectVisibleTodos } = createTodoStore(state, options);
      let renders = 0;
      const first = renderHook(() => {
        renders++;
        return store.useSelector(selectVisibleTodos);
      });
      const second = renderHook(() => store.useSelector(selectVisibleTodos));
      const selected = first.result.current;
      act(() => {
        for (let progress = 1; progress <= 100; progress++) store.set({ progress }, true);
      });
      expect(filter).toHaveBeenCalledTimes(1);
      expect(renders).toBe(1);
      expect(first.result.current).toBe(selected);
      expect(second.result.current).toBe(selected);
      act(() => store.set({ filter: 'done' }, true));
      expect(filter).toHaveBeenCalledTimes(2);
      expect(first.result.current).toEqual([{ id: 2, done: true }]);
      expect(second.result.current).toBe(first.result.current);
      act(() => store.set({ todos: [{ id: 3, done: true }] }, true));
      expect(first.result.current).toEqual([{ id: 3, done: true }]);
      expect(second.result.current).toBe(first.result.current);
    },
  );

  it('recomputes correctly when an older snapshot is read again', () => {
    const state = initialState();
    const select = createVisibleTodoSelector();
    expect(select(state)).toEqual([{ id: 1, done: false }]);
    expect(select({ ...state, filter: 'done' })).toEqual([{ id: 2, done: true }]);
    expect(select(state)).toEqual([{ id: 1, done: false }]);
    expect(select({ ...state, filter: 'all' })).toBe(state.todos);
  });

  it('keeps caches separate for different store/request instances', () => {
    const state = initialState();
    const first = createTodoStore(state);
    const second = createTodoStore(state);
    expect(first.selectVisibleTodos(state)).not.toBe(second.selectVisibleTodos(state));
  });

  it('hydrates the initial selection before applying a newer client snapshot', async () => {
    const { store, selectVisibleTodos } = createTodoStore(initialState(), { comparator: Object.is });
    function Selected() {
      return <span>{store.useSelector(selectVisibleTodos).map((todo) => todo.id).join(',')}</span>;
    }
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Selected />);
    expect(container.textContent).toBe('1');
    store.set({ todos: [{ id: 3, done: false }] }, true);
    const errors: unknown[] = [];
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <Selected />, { onRecoverableError: (error) => errors.push(error) });
    });
    try {
      expect(errors).toEqual([]);
      expect(container.textContent).toBe('3');
    } finally {
      act(() => root.unmount());
    }
  });

  it('keeps committed output correct after a suspended render changes the shared cache', async () => {
    const { store, selectVisibleTodos } = createTodoStore(initialState(), { comparator: Object.is });
    const pending = new Promise<void>(() => {});
    let changeFilter!: (filter: TodoState['filter']) => void;
    function Selected() {
      const [filter, setFilter] = useState<TodoState['filter']>('active');
      changeFilter = setFilter;
      const visible = store.useSelector((state) => selectVisibleTodos({ ...state, filter }));
      if (filter === 'done') throw pending;
      return <span>{visible.map((todo) => todo.id).join(',')}</span>;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(<StrictMode><Suspense fallback="loading"><Selected /></Suspense></StrictMode>);
    });
    try {
      await act(async () => { startTransition(() => changeFilter('done')); });
      expect(container.textContent).toBe('1');
      act(() => store.set({ todos: [{ id: 3, done: false }] }, true));
      expect(container.textContent).toBe('3');
    } finally {
      act(() => root.unmount());
    }
  });
});
