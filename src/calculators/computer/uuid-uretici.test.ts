import { describe, it, expect } from 'vitest';
import {
  isValidUuidV4,
  generateUuids,
  uuidUreticiMeta,
  UUID_ERROR,
  type UuidGenerator,
} from './uuid-uretici';

describe('isValidUuidV4', () => {
  it('accepts canonical v4 UUIDs (any case)', () => {
    expect(isValidUuidV4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuidV4('109156be-c4fb-41ea-b1b4-efe1671c5836')).toBe(true);
    expect(isValidUuidV4('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true); // uppercase
    expect(isValidUuidV4('  9f1b8c2a-3d4e-4f5a-8b6c-7d8e9f0a1b2c  ')).toBe(true); // trimmed
  });

  it('rejects malformed / wrong-version / wrong-variant / empty', () => {
    expect(isValidUuidV4('')).toBe(false);
    expect(isValidUuidV4('not-a-uuid')).toBe(false);
    expect(isValidUuidV4('550e8400-e29b-41d4-a716-44665544000')).toBe(false); // too short
    expect(isValidUuidV4('550e8400-e29b-11d4-a716-446655440000')).toBe(false); // version 1, not 4
    expect(isValidUuidV4('550e8400-e29b-41d4-c716-446655440000')).toBe(false); // variant c (not 8-b)
    expect(isValidUuidV4('550e8400e29b41d4a716446655440000')).toBe(false); // no dashes
    expect(isValidUuidV4('zzzzzzzz-e29b-41d4-a716-446655440000')).toBe(false); // non-hex
  });
});

describe('generateUuids — batch helper (injected generator)', () => {
  /** Deterministic stub: emits valid v4 UUIDs varying by an index nibble. */
  function stubGenerator(): UuidGenerator {
    let i = 0;
    return () => {
      const n = (i++ % 16).toString(16);
      return `109156be-c4fb-41ea-b1b4-efe1671c583${n}`;
    };
  }

  it('returns exactly N validated UUIDs', () => {
    for (const count of [1, 5, 50]) {
      const r = generateUuids(count, stubGenerator());
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.uuids.length).toBe(count);
      expect(r.uuids.every(isValidUuidV4)).toBe(true);
    }
  });

  it('fails when count is out of [1, 50] or not an integer', () => {
    for (const count of [0, -1, 51, 100, 2.5, NaN]) {
      const r = generateUuids(count, stubGenerator());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(UUID_ERROR.COUNT_RANGE);
    }
  });

  it('fails defensively if the generator yields an invalid UUID', () => {
    const r = generateUuids(3, () => 'not-a-uuid');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(UUID_ERROR.INVALID_UUID);
  });
});

describe('uuidUreticiMeta', () => {
  it('exposes the expected registry metadata (no formula)', () => {
    expect(uuidUreticiMeta.id).toBe('uuid-uretici');
    expect(uuidUreticiMeta.slug).toBe('uuid-uretici');
    expect(uuidUreticiMeta.categoryId).toBe('computer');
    expect(uuidUreticiMeta.formula).toBeUndefined();
    expect(uuidUreticiMeta.faq?.length).toBe(2);
  });
});
