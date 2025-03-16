import { describe, it, expect } from 'vitest';
import { createStore } from '../src/index';
import { renderHook } from '@testing-library/react-hooks';
import { render, screen } from '@testing-library/react';

const waitFor = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));

describe('createStore', () => {
  it('should initialize the store with the initial value', () => {
    const store = createStore(10);
    expect(store.get()).toBe(10);
  });

  it('should initialize the store with the initial value returned by a function', () => {
    const store = createStore(() => 20);
    expect(store.get()).toBe(20);
  });

  it('should update the store value', () => {
    const store = createStore(10);
    store.set(20);
    expect(store.get()).toBe(20);
  });

  it('should update the store value using a function', () => {
    const store = createStore(10);
    store.set((prev) => prev + 5);
    expect(store.get()).toBe(15);
  });

  it('should update the store value using a function, partial', () => {
    const store = createStore({ name: 'Saiya', age: 10 });
    store.set((prev) => ({ age: 5 + prev.age }), true);
    expect(store.get().age).toBe(15);
    store.set({ age: 5 }, true);
    expect(store.get().age).toBe(5);
    expect(store.get().name).toBe('Saiya');
    // @ts-expect-error test partial
    store.set(50, true);
    expect(store.get()).toBe(50);
  });
  it('should update the store value using a function, partial2', () => {
    const store = createStore({ name: 'Saiya', age: 10 });
    store.set((prev) => ({ age: 5 + prev.age }), { partial: true });
    expect(store.get().age).toBe(15);
    store.set({ age: 5 }, { partial: true });
    expect(store.get().age).toBe(5);
    expect(store.get().name).toBe('Saiya');
    // @ts-expect-error test partial
    store.set(50, false);
    expect(store.get()).toBe(50);
  });

  it('should not update the store value if the new value is equal to the current value', () => {
    const store = createStore(10);
    store.set(10);
    expect(store.get()).toBe(10);
  });


  it('should get store value and update its value when the store value changes', () => {
    const store = createStore(10);
    const { result } = renderHook(() => store.useStore());
    expect(result.current).toBe(10);

    store.set(5);
    expect(result.current).toBe(5);
  });

  it('should get old store value after unmount', () => {
    const store = createStore({name: 'Saiya'});
    const { result, unmount} = renderHook(() => store.useStore());
    expect(result.current.name).toBe('Saiya');
    unmount();
    store.set((prev) => ({...prev, name: 'Goku'}));
    expect(result.current.name).toBe('Saiya');
  });

  it('should create a selector and update its value when the store value changes', () => {
    const store = createStore(10);
    const { result } = renderHook(() => store.useSelector((value) => value * 2));
    expect(result.current).toBe(20);

    store.set(5);
    expect(result.current).toBe(10);
  });

  it('should not update the selector value if the store value does not change', () => {
    const store = createStore(10);
    const { result, unmount } = renderHook(() => store.useSelect((value) => value * 2));
    expect(result.current).toBe(20);

    store.set(10);
    expect(result.current).toBe(20);
    store.set(6);
    expect(result.current).toBe(12);
    unmount();
    store.set(12);
    expect(result.current).toBe(12);
  });

  it('should not update the selector value if the store value does not change', () => {
    const store = createStore('xxx');
    const { result } = renderHook(() => store.useSelect((value) => value.length));
    expect(result.current).toBe(3);

    store.set('abc');
    expect(result.current).toBe(3);
  });

  it('check useSelect render times', () => {
    const store = createStore('xxx');
    let renderCount = 0
    const { result } = renderHook(() => {
      renderCount++;
      return store.useSelect((value) => value.length)
    });
    expect(renderCount).toBe(1);
    expect(result.current).toBe(3);
    store.set('abc');
    expect(renderCount).toBe(1);
    expect(result.current).toBe(3);
    store.set('abcd');
    expect(renderCount).toBe(2);
    expect(result.current).toBe(4);
  });

  it('check render effect', async () => {
    const store = createStore('xxx');
    const TestComponent = () => {
      const val = store.useSelector((value) => value.length)
      return <div data-testid="div">{val}</div>
    }
    render(<TestComponent />)

    const result = await screen.getByTestId('div')
    expect(result.innerHTML).toBe('3');
  });

  it('check subscribe', async () => {
    let changed = 0
    const store = createStore('xxx');
    const unsubscribe = store.subscribe(() => {
      changed++
    })
    expect(changed).toBe(0);
    store.set('abc');
    expect(changed).toBe(1);
    unsubscribe();
    store.set('abcd');
    expect(changed).toBe(1);
  });

  it('async subscribe', async () => {
    let changed = 0
    const store = createStore('xxx');

    store.subscribe(() => {
      changed++
    })
    expect(changed).toBe(0);
    const updateAsync = async () => {
      await waitFor(1000)
      return 'efg'
    }
    store.set(updateAsync);
    expect(changed).toBe(0);
    await waitFor(1000)
    expect(changed).toBe(1);
  });

  it('without custom comparator', async () => {
    let changed = 0
    const store = createStore(1);
    const unsubscribe = store.subscribe(() => {
      changed++
    })
    store.set(2);
    expect(changed).toBe(1);
    store.set(NaN);
    expect(changed).toBe(2);
    store.set(NaN);
    expect(changed).toBe(2);
    unsubscribe();
    store.set(233);
    expect(changed).toBe(2);
  })
  it('custom comparator', async () => {
    const comparator = (a: any, b: any) => a === b
    let changed = 0
    const store = createStore(1,{
      comparator
    });
    const unsubscribe = store.subscribe(() => {
      changed++
    })
    store.set(2);
    expect(changed).toBe(1);
    store.set(NaN);
    expect(changed).toBe(2);
    store.set(NaN);
    expect(changed).toBe(3);
    unsubscribe();
    store.set(NaN);
    expect(changed).toBe(3);
  })
});
