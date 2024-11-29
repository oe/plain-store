import { describe, it, expect } from 'vitest';
import { isDeepEqual } from '../src/index';

describe('isDeepEqual', () => {
  it('should return true for equal primitive values', () => {
    const equals = [
      [+0, -0],
      [0, 0],
      [5, 5],
      ['5', '5'],
      [true, true],
      [false, false],
      [null, null],
      [undefined, undefined],
      [NaN, NaN],
      [new Number(5), Number(5)],
      [new String('a5'), 'a5'],
      [new String('a5'), String('a5')],
      [new Boolean(true), true],
      [new Boolean(false), false],
    ]
    equals.forEach(([a, b]) => {
      expect(isDeepEqual(a, b)).toBe(true);
    });
  });

  it('should return false for unequal primitive values', () => {
    const notEquals = [
      [5, 10],
      ['hello', 'world'],
      [true, false],
      [null, undefined],
      [null, {}],
      [undefined, {}],
      [NaN, 0],
      [new Number(5), 53],
      [new String('a5'), 'a'],
      [new Boolean(true), false],
      [new Boolean(false), true],
      [new Boolean(false), 0],
      [new Boolean(true), 1],
      [new Boolean(true), 10],
      [0, '0'],
      [0, ''],
    ]
    notEquals.forEach(([a, b]) => {
      expect(isDeepEqual(a, b)).toBe(false);
    });
  });

  it('should correctly handle Dates', () => {
    const samples = [
      [new Date(2020, 1, 1), new Date(2020, 1, 1), true],
      [new Date(2020, 1, 1), new Date(2020, 1, 2), false],
      [new Date(), new Date(), true],
      [new Date(), /abc/, false],
    ]
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle RegExp', () => {
    const samples = [
      [/abc/, /abc/, true],
      [/abc/, /def/, false],
      [/abc/, /abc/i, false],
      [/abc/i, /abc/ig, false],
      [/abc/i, /abc/, false],
      [/abc/i, /def/i, false],
      [/abc/i, new RegExp('abc', 'i'), true],
      [/abc/i, new RegExp('abc'), false],
      [new RegExp('abc', 'ig'), new RegExp('abc', 'ig'), true],
      [new RegExp('abc', 'ig'), new RegExp('abc', 'i'), false],
      [new RegExp('abc', 'ig'), 3, false],
    ]
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle Map and Set', () => {
    const samples = [
      [new Map([[1, 2], [3, 4]]), new Map([[1, 2], [3, 4]]), true],
      [new Map([[3, 4], [1, 2]]), new Map([[1, 2], [3, 4]]), true],
      [new Map([[{a: 2}, 2], [{a: 3}, 4]]), new Map([[{a: 3}, 4], [{a: 2}, 2]]), false],
      [new Map([[{a: 2}, 2], [{a: 3}, 4]]), new Map([[1, 2], [3, 4]]), false],
      [new Map([[1, 2], [3, 4]]), new Map([[1, 2]]), false],
      [new Map([[1, 2], [3, 4]]), new Map([[1, 2], [3, 5]]), false],
      [new Map([[1, 2], [3, 4]]), new Map([[1, 2]]), false],
      [new Map([[1, 2], [3, 4]]), new Map([[1, 2], [3, 4], [5, 6]]), false],
      [new Set([1, 2, 3]), new Set([2, 1, 3]), true],
      [new Set([1, 2, 3]), new Set([1, 2, 4]), false],
      [new Set([1, 2, 3]), new Set([1, 4]), false],
      [new Set([1, 2, 3]), new Set([1, 2]), false],
      [new Set([1, 2, 3]), new Set([1, 2, 3, 4]), false],
    ]
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should return true for deeply equal objects', () => {
    const samples = [
      [{ a: 1, b: 2 }, { a: 1, b: 2 }, true],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }, true],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } }, false],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { d: 2 } }, false],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2, d: 3 } }, false],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 }, d: 3 }, false],
      [{ a: 1, b: { c: 2 }, d: 3 }, { a: 1, b: { c: 2 }, d: 3 }, true],
      [{ a: 1, b: { c: 2 }, d: 3 }, { a: 1, b: { c: 2 }, d: 4 }, false],
    ]
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should return false for deeply unequal arrays', () => {
    const samples = [
      [[1, 2, 3], [1, 2, 3], true],
      [[1, 2, 3], [1, 2, 4], false],
      [[1, 2, 3], [1, 2], false],
      [[1, 2, 3], [1, 2, 3, 4], false],
      [[1, 2, 3], [1, 2, '3'], false],
      [[1, 2, 3], [1, 2, 3, '4'], false],
      [[1, 2, 3], [1, 2, 3, 4], false],
      [[1, 2, 3], [1, 2, 3, 4], false],
      [[1, 2, 3], [1, 2, 3, 4], false],
      [[1, 2, 3], [1, 2, 3, 4], false],
      [[1, 2, 3], [1, 2, 3, 4], false],
      [[[1, 2], [3, 4]], [[1, 2], [3, 4]], true],
      [[[1, 2], [3, 4]], [[1, 2], [3, 5]], false],
      [[[1, 2], [3, 4]], [[1, 2], [3]], false],
      [[[1, 2], [3, 4]], [[1, 2], [3, 4], [5, 6]], false],
    ]
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should return false when comparing functions', () => {
    const samples = [
      [() => {}, () => {}, false],
      [() => {}, () => 1, false],
      [() => 1, () => 1, false],
      [() => 1, () => 2, false],
      [() => 2, '() => 2', false],
      [Array.isArray, Array.isArray, true],
    ]
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should handle edge cases', () => {
    const img = new Image()
    const samples = [
      [document.createElement('div'), document.createElement('div'), false],
      [img, img, true],
    ]
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle complex object', () => {
    const samples = [
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }, true],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } }, false],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { d: 2 } }, false],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2, d: 3 } }, false],
      [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 }, d: 3 }, false],
      [{ a: 1, b: { c: 2 }, d: 3 }, { a: 1, b: { c: 2 }, d: 3 }, true],
      [{ a: 1, b: { c: 2 }, d: 3 }, { a: 1, b: { c: 2 }, d: 4 }, false],
      [{ a: 1, b: { c: 2 }, d: 3 }, { a: 1, b: { c: 2 }, d: 3, e: 4 }, false],
      [{ a: 1, b: { c: 2 }, d: 3, e: 4 }, { a: 1, b: { c: 2 }, d: 3, e: 4 }, true],
      [{ a: 1, b: { c: 2 }, d: 3, e: 4 }, { a: 1, b: { c: 2 }, d: 3, e: 5 }, false],
      [{ a: 1, b: { c: 2 }, d: 3, e: 4 }, { a: 1, b: { c: 2 }, d: 3, e: 4, f: 5 }, false],
      [{ a: 1, b: { c: 2 }, d: 3, e: 4, f: 5 }, { a: 1, b: { c: 2 }, d: 3, e: 4, f: 5 }, true],
      [{ a: 1, b: { c: 2 }, d: 3, e: 4, f: 5 }, { a: 1, b: { c: 2 }, d: 3, e: 4, f: 6 }, false],
      [{ a: 1, b: { c: 2 }}, {}, false],
      [{a: [12,323], b: false}, {c: 1, d: 'hello'}, false],
    ]

    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle Symbols', () => {
    const samples = [
      [Symbol('foo'), Symbol('foo'), false],
      [Symbol.for('bar'), Symbol.for('bar'), true],
      [Symbol('foo'), Symbol('bar'), false],
      [Symbol.iterator, Symbol.iterator, true],
    ];
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle BigInt', () => {
    const samples = [
      [BigInt(1234567890123456789), BigInt(1234567890123456789), true],
      [BigInt(1234567890123456789), BigInt(9876543210987654321), false],
    ];
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle TypedArrays', () => {
    const buffer = new ArrayBuffer(8);
    const samples = [
      [new Int8Array([1, 2, 3]), new Int8Array([1, 2, 3]), true],
      [new Int8Array([1, 2, 3]), new Int8Array([1, 2, 4]), false],
      [new Int8Array([1, 2, 3]), new Int8Array([1, 2]), false],
      [new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]), true],
      [new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]), false],
      [new Float32Array([1.1, 2.2, 3.3]), new Float32Array([1.1, 2.2, 3.3]), true],
      [new Float32Array([1.1, 2.2, 3.3]), new Float32Array([1.1, 2.2, 3.4]), false],
      [new DataView(buffer), new DataView(buffer), true],
      [new DataView(buffer), new DataView(new ArrayBuffer(8)), true],
    ];
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle mixed types', () => {
    const samples = [
      [{ a: [1, { b: 2 }], c: 'foo' }, { a: [1, { b: 2 }], c: 'foo' }, true],
      [{ a: [1, { b: 2 }], c: 'foo' }, { a: [1, { b: 3 }], c: 'foo' }, false],
      [{ a: new Set([1, 2]), b: new Map([['key', 'value']]) }, { a: new Set([1, 2]), b: new Map([['key', 'value']]) }, true],
      [{ a: new Set([1, 2]), b: new Map([['key', 'value']]) }, { a: new Set([1, 3]), b: new Map([['key', 'value']]) }, false],
    ];
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });

  it('should correctly handle empty and null values', () => {
    const samples = [
      [null, null, true],
      [undefined, undefined, true],
      [null, undefined, false],
      [0, null, false],
      ['', null, false],
      [[], null, false],
      [{}, null, false],
      [NaN, NaN, true],
      [NaN, 0, false],
      [NaN, 'NaN', false],
    ];
    samples.forEach(([a, b, result]) => {
      expect(isDeepEqual(a, b)).toBe(result);
    });
  });
});