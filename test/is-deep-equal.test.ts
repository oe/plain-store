import { describe, it, expect } from 'vitest';
import { isDeepEqual } from '../src/index';

describe('isDeepEqual', () => {
  it('should return true for equal primitive values', () => {
    expect(isDeepEqual(5, 5)).toBe(true);
    expect(isDeepEqual('hello', 'hello')).toBe(true);
  });

  it('should return false for unequal primitive values', () => {
    expect(isDeepEqual(5, 10)).toBe(false);
    expect(isDeepEqual('hello', 'world')).toBe(false);
  });

  it('should return true for deeply equal objects', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2 } };
    expect(isDeepEqual(obj1, obj2)).toBe(true);
  });

  it('should return false for deeply unequal objects', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 3 } };
    expect(isDeepEqual(obj1, obj2)).toBe(false);
  });

  it('should return true for deeply equal arrays', () => {
    const arr1 = [1, [2, 3], 4];
    const arr2 = [1, [2, 3], 4];
    expect(isDeepEqual(arr1, arr2)).toBe(true);
  });

  it('should return false for deeply unequal arrays', () => {
    const arr1 = [1, [2, 3], 4];
    const arr2 = [1, [2, 4], 4];
    expect(isDeepEqual(arr1, arr2)).toBe(false);
  });

  it('should return false when comparing functions', () => {
    const func1 = () => {};
    const func2 = () => {};
    expect(isDeepEqual(func1, func2)).toBe(false);
  });

  it('should return true for NaN values', () => {
    expect(isDeepEqual(NaN, NaN)).toBe(true);
  });

  it('should return true for null values', () => {
    expect(isDeepEqual(null, null)).toBe(true);
  });

  it('should return false if one is null', () => {
    expect(isDeepEqual(null, {})).toBe(false);
  });

  it('should return false if keys\'s length not equal', () => {
    expect(isDeepEqual({a: 1}, {})).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(isDeepEqual(null, undefined)).toBe(false);
  });

  it('should return false for objects with different structures', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, c: 2 };
    expect(isDeepEqual(obj1, obj2)).toBe(false);
  });
});