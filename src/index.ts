import { useState, useEffect } from 'react';

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
export type IInitialState<T> = T | (() => T);

const needFreeze = (o: any) => o && typeof o === 'object' && !Object.isFrozen(o);

const hasOwn = Object.prototype.hasOwnProperty;
/**
 * Deep freeze an object
 * * do not use it to freeze object with circular references
 */
export function deepFreeze<R extends any>(o: R): Readonly<R> {
  if (!needFreeze(o)) return o;
  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (
      !hasOwn.call(o, prop) ||
      !needFreeze((o as any)[prop])
    )
      return;
    const descriptor = Object.getOwnPropertyDescriptor(o, prop);
    if (descriptor && (descriptor.get || descriptor.set)) return;
    deepFreeze((o as any)[prop]);
  });
  return Object.freeze(o);
}

const globalObject: any = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}
/** env builtin Objects */
const ITERABLE_TYPES = [Object, Array, globalObject.Uint8Array, globalObject.Uint8ClampedArray, globalObject.Uint16Array, globalObject.Uint32Array, globalObject.Int8Array, globalObject.Int16Array, globalObject.Int32Array, globalObject.Float32Array, globalObject.Float64Array, globalObject.BigInt64Array, globalObject.BigUint64Array].filter(Boolean)

/**
 * Deep compare two values
 */
export function isDeepEqual(a: any, b: any) {
  if (a === b) return true;
  if (a !== a && b !== b) return true; // NaN check
  if (a == null || b == null) return false;
  const constructor = a.constructor;
  if (constructor !== b.constructor || constructor === Function) return false;
  if (constructor === Date) return a.getTime() === b.getTime();
  if (constructor === RegExp) return a.toString() === b.toString();
  if (constructor === Map || constructor === Set) return isDeepEqual(Array.from(a), Array.from(b));
  if (constructor === String || constructor === Number || constructor === Boolean)
    return a.valueOf() === b.valueOf();
  if (!ITERABLE_TYPES.includes(constructor)) return false;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (const key in a) {
    if (
      !hasOwn.call(a, key) ||
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
  onChange?: (value: T) => void;
  /**
   * custom comparator for store value changes, default to `isDeepEqual`
   *  * use it when the default comparator is not working as expected
   *  * `isDeepEqual` works for most cases, but it's not perfect, you can provide a custom comparator to handle the edge cases or performance issues.
   */
  comparator?: (a: any, b: any) => boolean;
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
  const { onChange = noop, comparator = isDeepEqual } = options || {}
  // @ts-expect-error ignore type check for initialValue()
  let currentValue = deepFreeze<T>(typeof initialValue === 'function' ? initialValue() : initialValue);
  const listeners = new Set<(value: T) => void>();

  const useSelector = <R>(converter: (value: T) => R) => {
    const [data, setData] = useState(converter(currentValue))
    useEffect(() => {
      const listener = (value: T) => {
        setData((prev) => {
          const nextData = converter(value)
          if (comparator(prev, nextData)) return prev;
          return deepFreeze(nextData)
        })
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }, [])
    return data;
  }
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
      currentValue = deepFreeze<T>(nextVal);
      listeners.forEach((listener) => listener(currentValue));
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
    useStore() {
      const [, setRefresh] = useState(false);
      useEffect(() => {
        const listener = () => setRefresh((refresh) => !refresh);
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }, []);
      return currentValue;
    },
    /**
     * get the latest store value without reactive, can be used outside react component lifecycle
     */
    getStore() {
      return currentValue;
    },
    /**
     * update the store value, can be called outside react component lifecycle
     * @param newValue the new value to set, or a function that takes the previous value and returns the new value
     * * use getStore() to get the latest state of the store when using async function
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
    useSelect: useSelector,
  }
}
