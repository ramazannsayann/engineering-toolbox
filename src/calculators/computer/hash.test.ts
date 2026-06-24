import { describe, it, expect } from 'vitest';
import { computeHashes, hashMeta } from './hash';

/** Look up a row value by its label. */
async function hashes(text: string): Promise<Record<string, string>> {
  const r = await computeHashes(text);
  if (!r.ok) throw new Error('expected ok result');
  return Object.fromEntries(r.rows.map((row) => [row.label, row.value]));
}

describe('computeHashes — known vectors ("abc")', () => {
  it('matches the canonical MD5/SHA-1/SHA-256/SHA-512 of "abc"', async () => {
    const h = await hashes('abc');
    expect(h['MD5']).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(h['SHA-1']).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(h['SHA-256']).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(h['SHA-512']).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    );
  });
});

describe('computeHashes — empty string vectors', () => {
  it('matches the canonical hashes of the empty string', async () => {
    const h = await hashes('');
    expect(h['MD5']).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(h['SHA-1']).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(h['SHA-256']).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(h['SHA-512']).toBe(
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
    );
  });
});

describe('computeHashes — shape & UTF-8', () => {
  it('returns all four rows, lowercase hex, with correct lengths', async () => {
    const r = await computeHashes('hello');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((row) => row.label)).toEqual(['MD5', 'SHA-1', 'SHA-256', 'SHA-512']);
    const lengths: Record<string, number> = { MD5: 32, 'SHA-1': 40, 'SHA-256': 64, 'SHA-512': 128 };
    for (const row of r.rows) {
      expect(row.value).toMatch(/^[0-9a-f]+$/);
      expect(row.value.length).toBe(lengths[row.label]);
    }
  });

  it('hashes UTF-8 "Merhaba Dünya" without error (MD5 locked)', async () => {
    const h = await hashes('Merhaba Dünya');
    expect(h['MD5']).toBe('3c5cee1b19a1ca2a0ae50cb42c701a85');
    expect(h['SHA-256']).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashMeta', () => {
  it('exposes the expected registry metadata (no formula)', () => {
    expect(hashMeta.id).toBe('hash');
    expect(hashMeta.slug).toBe('hash-hesaplayici');
    expect(hashMeta.categoryId).toBe('computer');
    expect(hashMeta.formula).toBeUndefined();
    expect(hashMeta.faq?.length).toBe(2);
  });
});
