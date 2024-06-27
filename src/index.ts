import { useState, useEffect } from 'react';

/**
 * Initial state of the store
 */
export type IInitialState<T> = T | (() => T);

const needFreeze = (o : any) =>  o && typeof o === 'object' && !Object.isFrozen(o)

/**
 * Deep freeze an object
 */
export function deepFreeze<R extends any>(o: R): Readonly<R> {
  if (!needFreeze(o)) return o;
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach(function (prop) {
    // @ts-expect-error fix types
    if (!o.hasOwnProperty(prop) || !needFreeze(o[prop])) return
    const descriptor = Object.getOwnPropertyDescriptor(o, prop);
    if (descriptor && (descriptor.get || descriptor.set)) return
    // @ts-expect-error fix types
    deepFreeze(o[prop]);
  });
  return o;
}

/**
 * Deep compare two values
 */
export function isDeepEqual(a: any, b: any) {
  if (a === b) return true;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (const key in a) {
    if (!isDeepEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * create a store for state management
 * @param initialValue initial value of the store
 */
export function createStore<T>(initialValue: IInitialState<T>) {
  // @ts-expect-error fix types
  let value = deepFreeze<T>(typeof initialValue === 'function' ? initialValue() : initialValue);
  const listeners = new Set<(value: T) => void>();

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
      return value
    },
    /**
     * get the latest store value without reactive, can be used outside react component lifecycle
     */
    getStore() {
      return value;
    },
    /**
     * update the store value, can be called outside react component lifecycle
     * @param newValue the new value to set, or a function that takes the previous value and returns the new value
     * @returns 
     */
    setStore(newValue: T | ((prev: T) => T)) {
      // @ts-expect-error fix types
      const nextValue = typeof newValue === 'function' ? newValue(value) : newValue
      if (isDeepEqual(value, nextValue)) return;
      value = deepFreeze<T>(nextValue);
      listeners.forEach(listener => listener(value));
    },
    /**
     * create a selector for the store, re-render when the store value changes
     * @param converter convert the store value to a new value
     */
    useSelect<R>(converter: (value: T) => R) {
      const [data, setData] = useState(converter(value))
      useEffect(() => {
        const listener = (value: T) => {
          const nextData = converter(value)
          if (isDeepEqual(data, nextData)) return;
          setData(nextData)
        }
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }, [data])
      return data;
    },
  };
}
