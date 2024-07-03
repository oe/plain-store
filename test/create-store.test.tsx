import { describe, it, expect } from 'vitest';
import { createStore } from '../src/index';
import { renderHook } from '@testing-library/react-hooks';
import { render, screen } from '@testing-library/react';

describe('createStore', () => {
  it('should initialize the store with the initial value', () => {
    const store = createStore(10);
    expect(store.getStore()).toBe(10);
  });

  it('should initialize the store with the initial value returned by a function', () => {
    const store = createStore(() => 20);
    expect(store.getStore()).toBe(20);
  });

  it('should update the store value', () => {
    const store = createStore(10);
    store.setStore(20);
    expect(store.getStore()).toBe(20);
  });

  it('should update the store value using a function', () => {
    const store = createStore(10);
    store.setStore((prev) => prev + 5);
    expect(store.getStore()).toBe(15);
  });

  it('should not update the store value if the new value is equal to the current value', () => {
    const store = createStore(10);
    store.setStore(10);
    expect(store.getStore()).toBe(10);
  });


  it('should get store value and update its value when the store value changes', () => {
    const store = createStore(10);
    const { result } = renderHook(() => store.useStore());
    expect(result.current).toBe(10);

    store.setStore(5);
    expect(result.current).toBe(5);
  });

  it('should get old store value after unmount', () => {
    const store = createStore({name: 'Saiya'});
    const { result, unmount} = renderHook(() => store.useStore());
    expect(result.current.name).toBe('Saiya');
    unmount();
    store.setStore((prev) => ({...prev, name: 'Goku'}));
    expect(result.current.name).toBe('Saiya');
  });

  it('should create a selector and update its value when the store value changes', () => {
    const store = createStore(10);
    const { result } = renderHook(() => store.useSelect((value) => value * 2));
    expect(result.current).toBe(20);

    store.setStore(5);
    expect(result.current).toBe(10);
  });

  it('should not update the selector value if the store value does not change', () => {
    const store = createStore(10);
    const { result, unmount } = renderHook(() => store.useSelect((value) => value * 2));
    expect(result.current).toBe(20);

    store.setStore(10);
    expect(result.current).toBe(20);
    store.setStore(6);
    expect(result.current).toBe(12);
    unmount();
    store.setStore(12);
    expect(result.current).toBe(12);
  });

  it('should not update the selector value if the store value does not change', () => {
    const store = createStore('xxx');
    const { result } = renderHook(() => store.useSelect((value) => value.length));
    expect(result.current).toBe(3);

    store.setStore('abc');
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
    store.setStore('abc');
    expect(renderCount).toBe(1);
    expect(result.current).toBe(3);
    store.setStore('abcd');
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

  it('check onChange', async () => {
    let changed = 0
    const store = createStore('xxx', {
      onChange(value) {
        changed++
      }
    });
    expect(changed).toBe(0);
    store.setStore('abc');
    expect(changed).toBe(1);
  });
});
