import { describe, it, expect } from 'vitest';
import {
  encodeBase64,
  decodeBase64,
  convertBase64,
  base64Meta,
  BASE64_ERROR,
  type Base64Result,
} from './base64';

function expectError(result: Base64Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('base64 — ASCII (anchors)', () => {
  it('encodes "Hello, World!" → "SGVsbG8sIFdvcmxkIQ=="', () => {
    expect(encodeBase64('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==');
  });

  it('round-trips "Hello, World!"', () => {
    expect(decodeBase64('SGVsbG8sIFdvcmxkIQ==')).toBe('Hello, World!');
    expect(decodeBase64(encodeBase64('Hello, World!'))).toBe('Hello, World!');
  });

  it('encodes/decodes single and double padding correctly', () => {
    expect(encodeBase64('any carnal pleasure')).toBe('YW55IGNhcm5hbCBwbGVhc3VyZQ=='); // len%3==1 → ==
    expect(encodeBase64('any carnal pleasur')).toBe('YW55IGNhcm5hbCBwbGVhc3Vy'); // len%3==0 → no pad
    expect(encodeBase64('sure.')).toBe('c3VyZS4='); // len%3==2 → =
    expect(decodeBase64('c3VyZS4=')).toBe('sure.');
  });
});

describe('base64 — UTF-8 / Turkish / emoji round-trips', () => {
  it('round-trips "Merhaba Dünya" exactly', () => {
    const enc = encodeBase64('Merhaba Dünya');
    expect(decodeBase64(enc)).toBe('Merhaba Dünya');
    expect(enc).toBe('TWVyaGFiYSBEw7xueWE='); // stable UTF-8 encoding
  });

  it('round-trips every Turkish special character', () => {
    const tr = 'çÇşŞğĞıİöÖüÜ';
    expect(decodeBase64(encodeBase64(tr))).toBe(tr);
  });

  it('round-trips an emoji (4-byte UTF-8)', () => {
    expect(decodeBase64(encodeBase64('😀'))).toBe('😀');
    expect(decodeBase64(encodeBase64('Selam 👋🏼 dünya'))).toBe('Selam 👋🏼 dünya');
  });

  it('preserves newlines in a multi-line string', () => {
    const multi = 'satır1\nsatır2\nüçüncü satır';
    expect(decodeBase64(encodeBase64(multi))).toBe(multi);
  });
});

describe('convertBase64 — mode routing', () => {
  it('encode mode returns the Base64 output', () => {
    const r = convertBase64({ value: 'Hello, World!', mode: 'encode' });
    expect(r.ok && r.output).toBe('SGVsbG8sIFdvcmxkIQ==');
    expect(r.ok && r.mode).toBe('encode');
  });

  it('decode mode returns the decoded text', () => {
    const r = convertBase64({ value: 'TWVyaGFiYSBEw7xueWE=', mode: 'decode' });
    expect(r.ok && r.output).toBe('Merhaba Dünya');
  });

  it('decode is lenient about whitespace / newlines', () => {
    const r = convertBase64({ value: 'SGVsbG8s\n  IFdvcmxk\tIQ==', mode: 'decode' });
    expect(r.ok && r.output).toBe('Hello, World!');
  });
});

describe('convertBase64 — invalid / empty', () => {
  it('rejects empty encode input', () => {
    expectError(convertBase64({ value: '', mode: 'encode' }), BASE64_ERROR.EMPTY_INPUT);
  });

  it('rejects empty decode input (incl. whitespace-only)', () => {
    expectError(convertBase64({ value: '', mode: 'decode' }), BASE64_ERROR.EMPTY_INPUT);
    expectError(convertBase64({ value: '   \n ', mode: 'decode' }), BASE64_ERROR.EMPTY_INPUT);
  });

  it('rejects invalid Base64 on decode', () => {
    expectError(convertBase64({ value: '!!!notbase64!!!', mode: 'decode' }), BASE64_ERROR.INVALID_BASE64);
    expectError(convertBase64({ value: 'SGVsbG8', mode: 'decode' }), BASE64_ERROR.INVALID_BASE64); // length not %4
    expectError(convertBase64({ value: 'AB=C', mode: 'decode' }), BASE64_ERROR.INVALID_BASE64); // '=' not at end
  });

  it('encodes whitespace-only text (space is meaningful)', () => {
    const r = convertBase64({ value: '   ', mode: 'encode' });
    expect(r.ok && r.output).toBe('ICAg'); // three spaces
  });
});

describe('base64Meta', () => {
  it('exposes the expected registry metadata (no formula)', () => {
    expect(base64Meta.id).toBe('base64');
    expect(base64Meta.slug).toBe('base64-encode-decode');
    expect(base64Meta.categoryId).toBe('computer');
    expect(base64Meta.formula).toBeUndefined();
    expect(base64Meta.faq?.length).toBe(2);
  });
});
