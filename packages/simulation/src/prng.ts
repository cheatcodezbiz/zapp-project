/**
 * xoshiro128** — fast, high-quality 32-bit PRNG.
 * Deterministic: same seed always produces the same sequence.
 *
 * State is initialized via splitmix32 to expand a single 32-bit seed
 * into the four 32-bit words xoshiro128** requires.
 *
 * References:
 *   - Blackman & Vigna, "Scrambled Linear Pseudorandom Number Generators" (2021)
 *   - https://prng.di.unimi.it/xoshiro128starstar.c
 */

export interface PRNG {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Returns a float in [min, max) */
  nextFloat(min: number, max: number): number;
  /** Normal distribution via Box-Muller transform */
  nextGaussian(mean: number, stddev: number): number;
  /** Returns true with given probability (0-1) */
  nextBool(probability: number): boolean;
  /** Shuffle an array in-place (Fisher-Yates) and return it */
  shuffle<T>(array: T[]): T[];
  /** Pick a random element from an array */
  pick<T>(array: T[]): T;
  /** Returns a copy of this PRNG at the current state (for branching) */
  clone(): PRNG;
}

// ---------------------------------------------------------------------------
// splitmix32 — used solely to expand a single seed into xoshiro128** state
// ---------------------------------------------------------------------------

function splitmix32(seed: number): () => number {
  let z = seed | 0;
  return (): number => {
    z = (z + 0x9e3779b9) | 0;
    let t = z ^ (z >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    t = t ^ (t >>> 15);
    return t >>> 0; // return as unsigned 32-bit
  };
}

// ---------------------------------------------------------------------------
// 32-bit helper: rotate left
// ---------------------------------------------------------------------------

function rotl32(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

// ---------------------------------------------------------------------------
// createPRNG — public factory
// ---------------------------------------------------------------------------

export function createPRNG(seed: number): PRNG {
  // Expand the single seed into four 32-bit state words via splitmix32
  const sm = splitmix32(seed);
  const s0 = sm();
  const s1 = sm();
  const s2 = sm();
  const s3 = sm();

  return _createFromState(s0, s1, s2, s3);
}

// ---------------------------------------------------------------------------
// Internal constructor from full state (used by clone)
// ---------------------------------------------------------------------------

function _createFromState(
  initS0: number,
  initS1: number,
  initS2: number,
  initS3: number,
): PRNG {
  // Mutable state — each word treated as unsigned 32-bit via >>> 0
  let s0 = initS0 >>> 0;
  let s1 = initS1 >>> 0;
  let s2 = initS2 >>> 0;
  let s3 = initS3 >>> 0;

  // Box-Muller spare cache
  let hasSpare = false;
  let spare = 0;

  // --------------------------------------------------
  // Core: xoshiro128** next raw uint32
  // --------------------------------------------------
  function nextUint32(): number {
    // result = rotl(s1 * 5, 7) * 9
    const result = (Math.imul(rotl32(Math.imul(s1, 5), 7), 9)) >>> 0;

    const t = (s1 << 9) >>> 0;

    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;

    s2 = (s2 ^ t) >>> 0;

    s3 = rotl32(s3, 11);

    return result;
  }

  // --------------------------------------------------
  // Public API
  // --------------------------------------------------

  function next(): number {
    // Divide by 2^32 to get [0, 1)
    return nextUint32() / 0x100000000;
  }

  function nextInt(min: number, max: number): number {
    if (min > max) {
      throw new RangeError(`nextInt: min (${min}) must be <= max (${max})`);
    }
    if (min === max) return min;
    const range = max - min + 1;
    // For small ranges this is fine; bias is negligible for range << 2^32
    return min + (nextUint32() % range);
  }

  function nextFloat(min: number, max: number): number {
    if (min > max) {
      throw new RangeError(`nextFloat: min (${min}) must be <= max (${max})`);
    }
    return min + next() * (max - min);
  }

  function nextGaussian(mean: number, stddev: number): number {
    if (hasSpare) {
      hasSpare = false;
      return mean + stddev * spare;
    }

    // Box-Muller transform — generates two independent normals
    let u: number;
    let v: number;
    let s: number;

    do {
      u = next() * 2 - 1;
      v = next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    hasSpare = true;

    return mean + stddev * (u * mul);
  }

  function nextBool(probability: number): boolean {
    return next() < probability;
  }

  function shuffle<T>(array: T[]): T[] {
    // Fisher-Yates (Durstenfeld) shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      const tmp = array[i]!;
      array[i] = array[j]!;
      array[j] = tmp;
    }
    return array;
  }

  function pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new RangeError("pick: cannot pick from an empty array");
    }
    return array[nextInt(0, array.length - 1)]!;
  }

  function clone(): PRNG {
    const cloned = _createFromState(s0, s1, s2, s3);
    // Note: we do NOT copy the Box-Muller spare because the spare depends
    // on the *sequence* of calls, not just the state. A clone diverges
    // from this point onward, which is the correct semantic.
    return cloned;
  }

  return {
    next,
    nextInt,
    nextFloat,
    nextGaussian,
    nextBool,
    shuffle,
    pick,
    clone,
  };
}

// ---------------------------------------------------------------------------
// seedFromString — deterministic seed derivation from an arbitrary string
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic 32-bit seed from a string (e.g. simulation ID).
 * Uses FNV-1a hash, which has excellent avalanche properties for short strings.
 */
export function seedFromString(str: string): number {
  // FNV-1a parameters for 32-bit
  let hash = 0x811c9dc5; // FNV offset basis
  const FNV_PRIME = 0x01000193;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0; // ensure unsigned
}
