// @ts-check
/** Canonical plain data encoding for deterministic digests, validation and save cloning. */

/**
 * Encode finite plain data with lexicographically sorted object keys. Reject cycles,
 * undefined, sparse arrays, custom prototypes and unsafe property names.
 * @calls 无内部公开函数。
 * @param {object | import('../contracts.d.ts').Json} value
 * @returns {string}
 */
export function serializeCanonical(value) {
  const ancestors = new Set();
  /** @param {object | import('../contracts.d.ts').Json} item @returns {string} */
  function encode(item) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new TypeError('Non-finite data');
      return JSON.stringify(item);
    }
    if (typeof item !== 'object' || ancestors.has(item)) throw new TypeError('Non-plain or cyclic data');
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new TypeError('Non-plain object');
    ancestors.add(item);
    let result;
    if (Array.isArray(item)) {
      const parts = [];
      for (let index = 0; index < item.length; index++) {
        if (!Object.hasOwn(item, index)) throw new TypeError('Sparse array');
        parts.push(encode(item[index]));
      }
      result = `[${parts.join(',')}]`;
    } else {
      result = `{${Object.keys(item).sort().map(key => {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new TypeError('Unsafe property name');
        return `${JSON.stringify(key)}:${encode(/** @type {Record<string, import('../contracts.d.ts').Json>} */ (item)[key])}`;
      }).join(',')}}`;
    }
    ancestors.delete(item);
    return result;
  }
  return encode(value);
}

/**
 * Deterministic 64-bit FNV-1a checksum over canonical UTF-8 bytes. Detects accidental
 * corruption and replay divergence; this is not an authentication signature.
 * @calls domain/serialization.js#serializeCanonical
 * @param {object | import('../contracts.d.ts').Json} value
 * @returns {string}
 */
export function createDataDigest(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(serializeCanonical(value))) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
