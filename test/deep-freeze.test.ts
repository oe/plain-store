import { describe, it, expect } from 'vitest';
import { deepFreeze } from '../src/index';

describe('deepFreeze', () => {
  it('returns primitive values unchanged', () => {
    const num = 1;
    expect(deepFreeze(num)).toBe(num);
  });

  it('freezes an object', () => {
    const obj = { key: 'value' };
    const frozenObj = deepFreeze(obj);
    expect(() => {
      // @ts-expect-error Testing immutability
      frozenObj.newKey = 'newValue';
    }).toThrow();
    expect(Object.isFrozen(frozenObj)).toBe(true);
  });

  it('freezes an array', () => {
    const arr = [1, 2, 3];
    const frozenArr = deepFreeze(arr);
    expect(() => {
      // @ts-expect-error Testing immutability
      frozenArr.push(4);
    }).toThrow();
    expect(Object.isFrozen(frozenArr)).toBe(true);
  });
  it('freezes an object has getter', () => {
    const obj = { a: 1, get b() { return 2; }, c: {  set() {}} };
    const frozenArr = deepFreeze(obj);
    expect(Object.isFrozen(frozenArr)).toBe(true);
  });

  it('deep freezes an object', () => {
    const obj = { inner: { key: 'value' } };
    const frozenObj = deepFreeze(obj);
    expect(() => {
      // @ts-expect-error Testing immutability
      frozenObj.inner.newKey = 'newValue';
    }).toThrow();
    expect(Object.isFrozen(frozenObj.inner)).toBe(true);
  });

  it('is idempotent', () => {
    const obj = { key: 'value' };
    const frozenObj = deepFreeze(obj);
    expect(() => deepFreeze(frozenObj)).not.toThrow();
    expect(Object.isFrozen(frozenObj)).toBe(true);
  });
});