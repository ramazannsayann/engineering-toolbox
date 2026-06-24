import { describe, it, expect } from 'vitest';
import {
  convertUrl,
  urlEncodeMeta,
  URL_ENCODE_ERROR,
  type UrlResult,
} from './url-encode';

function expectError(result: UrlResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

function out(result: UrlResult): string {
  if (!result.ok) throw new Error('expected ok result');
  return result.output;
}

describe('convertUrl — component (anchors)', () => {
  it('encodes "merhaba dünya & ?" → "merhaba%20d%C3%BCnya%20%26%20%3F"', () => {
    const r = convertUrl({ value: 'merhaba dünya & ?', mode: 'encode', target: 'component' });
    expect(out(r)).toBe('merhaba%20d%C3%BCnya%20%26%20%3F');
  });

  it('round-trips back via decode/component', () => {
    const enc = out(convertUrl({ value: 'merhaba dünya & ?', mode: 'encode', target: 'component' }));
    expect(out(convertUrl({ value: enc, mode: 'decode', target: 'component' }))).toBe('merhaba dünya & ?');
  });

  it('round-trips every Turkish special character', () => {
    const tr = 'çÇşŞğĞıİöÖüÜ';
    const enc = out(convertUrl({ value: tr, mode: 'encode', target: 'component' }));
    expect(out(convertUrl({ value: enc, mode: 'decode', target: 'component' }))).toBe(tr);
  });

  it('decodes "%C3%BC" → "ü" and "%20" → " "', () => {
    expect(out(convertUrl({ value: '%C3%BC', mode: 'decode', target: 'component' }))).toBe('ü');
    expect(out(convertUrl({ value: '%20', mode: 'decode', target: 'component' }))).toBe(' ');
  });
});

describe('convertUrl — full vs component difference', () => {
  const url = 'https://x.com/a b?q=ç';

  it('full (encodeURI) preserves scheme/slashes/?/= but encodes space + ç', () => {
    const r = convertUrl({ value: url, mode: 'encode', target: 'full' });
    expect(out(r)).toBe('https://x.com/a%20b?q=%C3%A7');
  });

  it('component (encodeURIComponent) ALSO escapes :// ? =', () => {
    const r = convertUrl({ value: url, mode: 'encode', target: 'component' });
    expect(out(r)).toBe('https%3A%2F%2Fx.com%2Fa%20b%3Fq%3D%C3%A7');
  });

  it('the two targets produce different output for a structural URL', () => {
    const full = out(convertUrl({ value: url, mode: 'encode', target: 'full' }));
    const comp = out(convertUrl({ value: url, mode: 'encode', target: 'component' }));
    expect(full).not.toBe(comp);
    expect(full).toContain('://'); // preserved
    expect(comp).toContain('%3A%2F%2F'); // escaped
  });

  it('full decode round-trips', () => {
    const enc = out(convertUrl({ value: url, mode: 'encode', target: 'full' }));
    expect(out(convertUrl({ value: enc, mode: 'decode', target: 'full' }))).toBe(url);
  });
});

describe('convertUrl — invalid / empty', () => {
  it('rejects malformed percent sequences on decode (URIError caught)', () => {
    expectError(convertUrl({ value: '%ZZ', mode: 'decode', target: 'component' }), URL_ENCODE_ERROR.INVALID_ENCODING);
    expectError(convertUrl({ value: '%', mode: 'decode', target: 'component' }), URL_ENCODE_ERROR.INVALID_ENCODING);
    expectError(convertUrl({ value: '%A', mode: 'decode', target: 'component' }), URL_ENCODE_ERROR.INVALID_ENCODING);
    expectError(convertUrl({ value: '%ZZ', mode: 'decode', target: 'full' }), URL_ENCODE_ERROR.INVALID_ENCODING);
  });

  it('rejects empty input', () => {
    expectError(convertUrl({ value: '', mode: 'encode', target: 'component' }), URL_ENCODE_ERROR.EMPTY_INPUT);
    expectError(convertUrl({ value: '', mode: 'decode', target: 'full' }), URL_ENCODE_ERROR.EMPTY_INPUT);
  });

  it('encodes a meaningful single space (not treated as empty)', () => {
    expect(out(convertUrl({ value: ' ', mode: 'encode', target: 'component' }))).toBe('%20');
  });
});

describe('urlEncodeMeta', () => {
  it('exposes the expected registry metadata (no formula)', () => {
    expect(urlEncodeMeta.id).toBe('url-encode');
    expect(urlEncodeMeta.slug).toBe('url-encode-decode');
    expect(urlEncodeMeta.categoryId).toBe('computer');
    expect(urlEncodeMeta.formula).toBeUndefined();
    expect(urlEncodeMeta.faq?.length).toBe(2);
  });
});
