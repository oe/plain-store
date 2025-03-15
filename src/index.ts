import { useSyncExternalStore, useRef, useCallback } from 'react';

/**
 * Get a subset of a type
 * * T is the original type
 * * V is the subset type
 * * If T is primitive type, it will return a primitive type
 * * If T is an object, it will validate whether V is a subset of T
 */
export type ISubset<T, V> = T extends V ?  { [K in keyof V]: K extends keyof T ? V[K] : never } : never;

/**
 * Initial state of the store
 */
export type IInitialState<T> = T extends (...args: any[]) => any ? never : T | (() => T);

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Deep compare two values
 */
export function isDeepEqual(a: any, b: any) {
  if (a === b) return true;
  if (a !== a && b !== b) return true; // NaN check
  if (a == null || b == null) return false;
  const constructor = a.constructor;
  if (constructor !== b.constructor || constructor === Function) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (constructor === Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }
  if (constructor === Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !isDeepEqual(value, b.get(key))) return false;
    }
    return true;
  }
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    // @ts-expect-error a and b are TypedArray
    let length = a.length;
    // @ts-expect-error a and b are TypedArray
    if (length !== b.length) return false;
    // Compare the contents byte by byte
    for (let i = 0; i < length; i++) {
      // @ts-expect-error a and b are TypedArray
      if (a[i] !== b[i]) return false;
    }
    // If no differences found
    return true;
  }
  if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
  if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (const key in a) {
    if (
      !hasOwn.call(b, key) ||
      !isDeepEqual(a[key], b[key])
    )
      return false;
  }
  return true;
}


/**
 * Check if a value is a promise
 */
export function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return value instanceof Promise || (value && typeof (value as any).then === 'function')
}

/**
 * noop function, for default callback
 */
const noop = () => {}

/**
 * options for creating a store
 */
export interface ICreateStoreOptions<T> {
  /**
   * listen to the store value changes
   */
  onChange?: (value: Readonly<T>) => void;
  /**
   * custom comparator for store value changes, default to `isDeepEqual`
   *  * use it when the default comparator is not working as expected
   *  * `isDeepEqual` works for most cases, but it's not perfect, you can provide a custom comparator to handle the edge cases or performance issues.
   */
  comparator?: (a: unknown, b: unknown) => boolean;
}

export interface ISetStoreOptions {
  /**
   * only update the partial value of the store,
   * * the new value will be merged with the old value
   */
  partial?: boolean;
}

export type ISetStoreOptionsType = boolean | ISetStoreOptions

/**
 * create a store for state management
 * @param initialValue initial value of the store
 */
export function createStore<T>(initialValue: IInitialState<T>, options?: ICreateStoreOptions<T>) {
  const { onChange = noop, comparator = isDeepEqual } = options || {};
  let currentValue: Readonly<T> = typeof initialValue === 'function' ? initialValue() : initialValue;
  const listeners = new Set<() => void>();

  const subscribe = (callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  };

  const getSnapshot = () => currentValue;

  const useStore = () => useSyncExternalStore(subscribe, getSnapshot);

  const useSelector = <R>(converter: (value: T) => R): Readonly<R> => {
    const lastInfo = useRef({ value: converter(currentValue), converter });
    lastInfo.current.converter = converter;

    const subscribeChange = useCallback((callback: () => void) => {
      // wrap the callback to compare the new value with the old value
      const wrappedCallback = () => {
        const newValue = lastInfo.current.converter(currentValue);
        if (comparator(lastInfo.current.value, newValue)) return;
        lastInfo.current.value = newValue;
        callback();
      };
      return subscribe(wrappedCallback);
    }, []);

    return useSyncExternalStore(subscribeChange, () => lastInfo.current.value);
  };

  function setStore(
    newValue: T | ((prev: T) => T | Promise<T>),
    cfg?: { partial?: false } | false
  ): void | Promise<void>;

  function setStore<V extends ISubset<T, V>>(
    newValue: V | ((prev: T) => V | Promise<V>),
    cfg: { partial: true } | true
  ): void | Promise<void>;

  function setStore(
    newValue: any,
    cfg?: ISetStoreOptionsType
  ): void | Promise<void>  {
    let nextValue = typeof newValue === 'function' ? newValue(currentValue) : newValue;
    const partial = typeof cfg === 'object' ? cfg.partial : cfg;

    const dealWithNewValue = (nextVal: T) => {
      if (partial && typeof nextVal === 'object') {
        nextVal = { ...currentValue, ...nextVal };
      }
      if (comparator(currentValue, nextVal)) return;
      currentValue = nextVal;
      listeners.forEach((listener) => listener());
      onChange(currentValue);
    };

    if (isPromiseLike(nextValue)) {
      return nextValue.then(dealWithNewValue);
    } else {
      dealWithNewValue(nextValue);
    }
  }

  return {
    /**
     * use the store, get the whole store value and re-render when the store value changes
     *  * must be used inside a react component
     */
    useStore,
    /**
     * get the latest store value without reactive, can be used outside react component lifecycle
     */
    getStore: getSnapshot,
    /**
     * update the store value, can be called outside react component lifecycle
     * @param newValue the new value to set, or a function that takes the previous value and returns the new value
     * @param cfg optional options for setting the store value
     * @returns a promise if the new value is a async function, otherwise void
     */
    setStore,
    /**
     * create a selector for the store, re-render when the store value changes
     * @param converter convert the store value to a new value
     */
    useSelector,
    /**
     * create a selector for the store, get the latest store value without reactive
     * @deprecated use `useSelector` instead
     * @param converter convert the store value to a new value
     */
    useSelect: useSelector
  };
}
