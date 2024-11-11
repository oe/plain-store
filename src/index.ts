import { useState, useEffect } from 'react';

/**
 * Initial state of the store
 */
export type IInitialState<T> = T | (() => T);

const needFreeze = (o : any) =>  o && typeof o === 'object' && !Object.isFrozen(o)

/**
 * BetterPartial type, partial makes all properties optional
 * * this one make this specified properties as it is
 */
export type IBetterPartial<T, K extends keyof T> = Pick<T, K>

/**
 * Deep freeze an object
 * * do not use it to freeze object with circular references
 */
export function deepFreeze<R extends any>(o: R): Readonly<R> {
  if (!needFreeze(o)) return o;
  Object.getOwnPropertyNames(o).forEach(function (prop) {
    // @ts-expect-error fix types
    if (!o.hasOwnProperty(prop) || !needFreeze(o[prop])) return;
    const descriptor = Object.getOwnPropertyDescriptor(o, prop);
    if (descriptor && (descriptor.get || descriptor.set)) return;
    // @ts-expect-error fix types
    deepFreeze(o[prop]);
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
  // for NaN
  if (a !== a && b !== b) return true;
  if (a == null || b == null) return false;
  const constructor = a.constructor
  // not same type, or is a function
  if (constructor !== b.constructor || constructor === Function) return false;
  if (constructor === Date) return a.getTime() === b.getTime();
  if (constructor === RegExp) return a.toString() === b.toString();
  if (constructor === Map || constructor === Set) return isDeepEqual(Array.from(a), Array.from(b));
  // primitive types
  if (constructor === String || constructor === Number || constructor === Boolean) return a.valueOf() === b.valueOf();
  // not supported iterable types
  if (!ITERABLE_TYPES.includes(constructor)) return false;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (const key in a) {
    if (!isDeepEqual(a[key], b[key])) return false;
  }
  return true;
}


/**
 * Check if a value is a promise
 */
export function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  // @ts-expect-error fix types
  return value instanceof Promise || (value && typeof value.then === 'function')
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
  // @ts-expect-error fix types
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

  function setStore(newValue: T | ((prev: T) => (T | Promise<T>)), cfg?: { partial: false }): void | Promise<void>

  function setStore<K extends keyof T>(
    newValue: IBetterPartial<T, K> | ((prev: T) => (IBetterPartial<T, K> | Promise<IBetterPartial<T, K>>)),
    cfg: true): void | Promise<void>

  function setStore<K extends keyof T>(
    newValue: Partial<T> | ((prev: T) => (IBetterPartial<T, K> | Promise<IBetterPartial<T, K>>)),
    cfg: { partial: true }): void | Promise<void>

  function setStore(newValue: Partial<T> | T | ((prev: T) => (T | Partial<T> | Promise<Partial<T>> | Promise<T>)), cfg?: ISetStoreOptionsType): void | Promise<void> {
    // @ts-expect-error fix types
    let nextValue = typeof newValue === 'function' ? newValue(currentValue) : newValue
    const partial = typeof cfg === 'object' ? cfg.partial : cfg

    const dealWithNewValue = (nextValue: T) => {
      // merge partial value
      if (partial && typeof nextValue === 'object') {
        nextValue = { ...currentValue, ...nextValue }
      }
      if (comparator(currentValue, nextValue)) return;
      currentValue = deepFreeze<T>(nextValue);
      listeners.forEach(listener => listener(currentValue));
      onChange(currentValue)
    }
    // not using await to avoid async/await in the callback, which will cause async everywhere
    if (isPromiseLike(nextValue)) {
      return nextValue.then(dealWithNewValue)
    } else {
      dealWithNewValue(nextValue)
    }
  }

  return {
    /**
     * use the store, get the whole store value and re-render when the store value changes
     *  * must be used inside a react component
     */
    useStore() {
      const [_, setRefresh] = useState(false)
      useEffect(() => {
        const listener = () => setRefresh(refresh => !refresh)
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }, [])
      return currentValue
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
