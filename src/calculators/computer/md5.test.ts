import { describe, it, expect } from 'vitest';
import { md5, md5Bytes } from './md5';

describe('md5 — RFC 1321 canonical test vectors', () => {
  it('matches every RFC 1321 suite vector exactly', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661');
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(md5('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0');
    expect(md5('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b');
    expect(md5('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')).toBe(
      'd174ab98d277d9f5a5611c2c9f419d9f',
    );
    // 80 chars — crosses a 64-byte block boundary, exercising multi-block + padding.
    expect(
      md5('12345678901234567890123456789012345678901234567890123456789012345678901234567890'),
    ).toBe('57edf4a22be3c955ac49da2e2107b67a');
  });

  it('hashes the pangram', () => {
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe(
      '9e107d9d372bb6826bd81d3542a419d6',
    );
  });

  it('hashes UTF-8 "Merhaba Dünya" by its bytes (locked value)', () => {
    // Encodes ü as the UTF-8 bytes C3 BC before hashing — proves byte handling.
    expect(md5('Merhaba Dünya')).toBe('3c5cee1b19a1ca2a0ae50cb42c701a85');
  });

  it('handles block-boundary lengths (56 forces a 2nd block; 64 is one full block)', () => {
    expect(md5('a'.repeat(56))).toBe('3b0c8ac703f828b04c6c197006d17218');
    expect(md5('a'.repeat(64))).toBe('014842d480b571495a4a0363793f7367');
  });

  it('always returns 32 lowercase hex chars', () => {
    expect(md5('anything')).toMatch(/^[0-9a-f]{32}$/);
    expect(md5Bytes(new TextEncoder().encode('x')).length).toBe(32);
  });
});
