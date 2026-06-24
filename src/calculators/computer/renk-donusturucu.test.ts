import { describe, it, expect } from 'vitest';
import {
  convertColor,
  renkDonusturucuMeta,
  COLOR_ERROR,
  COLOR_FORMATS,
  type ColorResult,
} from './renk-donusturucu';

function expectError(result: ColorResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

function row(result: ColorResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  const found = result.rows.find((r) => r.label === label);
  if (!found) throw new Error(`no row "${label}"`);
  return found.value;
}

describe('convertColor — HEX input (anchors)', () => {
  it('#3498DB → rgb(52, 152, 219), hsl(204, 70%, 53%)', () => {
    const r = convertColor({ value: '#3498DB', fromFormat: 'hex' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rgb).toEqual({ r: 52, g: 152, b: 219 });
    expect(r.hex).toBe('#3498DB');
    expect(row(r, 'RGB')).toBe('rgb(52, 152, 219)');
    expect(row(r, 'HSL')).toBe('hsl(204, 70%, 53%)');
  });

  it('primaries & greys', () => {
    expect(row(convertColor({ value: '#FFFFFF', fromFormat: 'hex' }), 'HSL')).toBe('hsl(0, 0%, 100%)');
    expect(row(convertColor({ value: '#FFFFFF', fromFormat: 'hex' }), 'RGB')).toBe('rgb(255, 255, 255)');
    expect(row(convertColor({ value: '#000000', fromFormat: 'hex' }), 'HSL')).toBe('hsl(0, 0%, 0%)');
    expect(row(convertColor({ value: '#000000', fromFormat: 'hex' }), 'RGB')).toBe('rgb(0, 0, 0)');
    expect(row(convertColor({ value: '#FF0000', fromFormat: 'hex' }), 'HSL')).toBe('hsl(0, 100%, 50%)');
    expect(row(convertColor({ value: '#808080', fromFormat: 'hex' }), 'HSL')).toBe('hsl(0, 0%, 50%)'); // achromatic
  });

  it('shorthand #ABC expands to #AABBCC → rgb(170, 187, 204)', () => {
    const r = convertColor({ value: '#ABC', fromFormat: 'hex' });
    expect(r.ok && r.hex).toBe('#AABBCC');
    expect(row(r, 'RGB')).toBe('rgb(170, 187, 204)');
  });

  it('accepts no "#" and lowercase: "3498db" === #3498DB', () => {
    const r = convertColor({ value: '3498db', fromFormat: 'hex' });
    expect(r.ok && r.hex).toBe('#3498DB');
    expect(row(r, 'RGB')).toBe('rgb(52, 152, 219)');
  });
});

describe('convertColor — RGB input (anchors)', () => {
  it('"52, 152, 219" → #3498DB, hsl(204, 70%, 53%)', () => {
    const r = convertColor({ value: '52, 152, 219', fromFormat: 'rgb' });
    expect(r.ok && r.hex).toBe('#3498DB');
    expect(row(r, 'HSL')).toBe('hsl(204, 70%, 53%)');
  });

  it('"rgb(255,0,0)" → #FF0000', () => {
    const r = convertColor({ value: 'rgb(255,0,0)', fromFormat: 'rgb' });
    expect(r.ok && r.hex).toBe('#FF0000');
  });
});

describe('convertColor — HSL input (primaries → exact round trip)', () => {
  it('"0,100%,50%" → rgb(255,0,0) #FF0000', () => {
    const r = convertColor({ value: '0,100%,50%', fromFormat: 'hsl' });
    expect(r.ok && r.hex).toBe('#FF0000');
    expect(row(r, 'RGB')).toBe('rgb(255, 0, 0)');
  });

  it('"120,100%,50%" → rgb(0,255,0) #00FF00', () => {
    const r = convertColor({ value: '120,100%,50%', fromFormat: 'hsl' });
    expect(r.ok && r.hex).toBe('#00FF00');
    expect(row(r, 'RGB')).toBe('rgb(0, 255, 0)');
  });

  it('"0,0%,100%" → #FFFFFF', () => {
    const r = convertColor({ value: '0,0%,100%', fromFormat: 'hsl' });
    expect(r.ok && r.hex).toBe('#FFFFFF');
  });

  it('accepts "hsl(...)" wrapper and no-% variant', () => {
    const wrapped = convertColor({ value: 'hsl(240, 100%, 50%)', fromFormat: 'hsl' });
    expect(wrapped.ok).toBe(true);
    if (wrapped.ok) expect(wrapped.hex).toBe('#0000FF');
    const noPct = convertColor({ value: '0, 100, 50', fromFormat: 'hsl' });
    expect(noPct.ok).toBe(true);
    if (noPct.ok) expect(noPct.hex).toBe('#FF0000');
  });
});

describe('convertColor — invalid input', () => {
  it('rejects a bad hex (non-hex chars / wrong length)', () => {
    expectError(convertColor({ value: '#GG0000', fromFormat: 'hex' }), COLOR_ERROR.INVALID_HEX);
    expectError(convertColor({ value: '#12', fromFormat: 'hex' }), COLOR_ERROR.INVALID_HEX);
    expectError(convertColor({ value: 'xyz', fromFormat: 'hex' }), COLOR_ERROR.INVALID_HEX); // x/y/z aren't hex
    expectError(convertColor({ value: '#12345', fromFormat: 'hex' }), COLOR_ERROR.INVALID_HEX); // 5 digits
  });

  it('"abc" is a VALID hex shorthand (#AABBCC) but invalid as RGB', () => {
    const asHex = convertColor({ value: 'abc', fromFormat: 'hex' });
    expect(asHex.ok && asHex.hex).toBe('#AABBCC');
    expectError(convertColor({ value: 'abc', fromFormat: 'rgb' }), COLOR_ERROR.INVALID_RGB);
  });

  it('rejects RGB out of range / wrong count', () => {
    expectError(convertColor({ value: '300,0,0', fromFormat: 'rgb' }), COLOR_ERROR.INVALID_RGB);
    expectError(convertColor({ value: '1,2', fromFormat: 'rgb' }), COLOR_ERROR.INVALID_RGB);
    expectError(convertColor({ value: 'rgba(0,0,0,0.5)', fromFormat: 'rgb' }), COLOR_ERROR.INVALID_RGB);
  });

  it('rejects HSL out of range', () => {
    expectError(convertColor({ value: '400,0,0', fromFormat: 'hsl' }), COLOR_ERROR.INVALID_HSL);
    expectError(convertColor({ value: '0,150%,50%', fromFormat: 'hsl' }), COLOR_ERROR.INVALID_HSL);
  });

  it('rejects empty input', () => {
    expectError(convertColor({ value: '', fromFormat: 'hex' }), COLOR_ERROR.EMPTY_INPUT);
    expectError(convertColor({ value: '   ', fromFormat: 'rgb' }), COLOR_ERROR.EMPTY_INPUT);
  });
});

describe('COLOR_FORMATS & metadata', () => {
  it('exposes the three formats', () => {
    expect(COLOR_FORMATS.map((f) => f.id)).toEqual(['hex', 'rgb', 'hsl']);
  });

  it('exposes the expected registry metadata (no formula)', () => {
    expect(renkDonusturucuMeta.id).toBe('renk-donusturucu');
    expect(renkDonusturucuMeta.slug).toBe('renk-donusturucu');
    expect(renkDonusturucuMeta.categoryId).toBe('computer');
    expect(renkDonusturucuMeta.formula).toBeUndefined();
    expect(renkDonusturucuMeta.relatedTools).toContain('direnc-renk-kodu');
    expect(renkDonusturucuMeta.faq?.length).toBe(2);
  });
});
