import { describe, it, expect } from 'vitest';
import {
  processJson,
  jsonFormatlaMeta,
  JSON_ERROR,
  type JsonResult,
} from './json-formatla';

function out(result: JsonResult): string {
  if (!result.ok) throw new Error('expected ok result');
  return result.output;
}

function expectError(result: JsonResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

const SAMPLE = '{"a":1,"b":[2,3]}';
const SAMPLE_OBJ = { a: 1, b: [2, 3] };

describe('processJson — format (pretty-print)', () => {
  it('2-space indent → multi-line, re-parses to the original object', () => {
    const r = processJson({ value: SAMPLE, mode: 'format', indent: '2' });
    const o = out(r);
    expect(o).toContain('\n');
    expect(o).toContain('\n  "a": 1'); // 2-space indent
    expect(JSON.parse(o)).toEqual(SAMPLE_OBJ); // content preserved
  });

  it('4-space indent', () => {
    const o = out(processJson({ value: SAMPLE, mode: 'format', indent: '4' }));
    expect(o).toContain('\n    "a": 1'); // 4-space indent
    expect(JSON.parse(o)).toEqual(SAMPLE_OBJ);
  });

  it('tab indent', () => {
    const o = out(processJson({ value: SAMPLE, mode: 'format', indent: 'tab' }));
    expect(o).toContain('\n\t"a": 1'); // tab indent
    expect(JSON.parse(o)).toEqual(SAMPLE_OBJ);
  });

  it('preserves nested structure (deep round-trip)', () => {
    const nested = '{"x":{"y":[{"z":true}],"n":null},"s":"hi"}';
    const o = out(processJson({ value: nested, mode: 'format', indent: '2' }));
    expect(JSON.parse(o)).toEqual(JSON.parse(nested));
  });

  it('preserves Turkish/unicode string values', () => {
    const r = processJson({ value: '{"ad":"Dünya"}', mode: 'format', indent: '2' });
    const o = out(r);
    expect(o).toContain('"Dünya"');
    expect(JSON.parse(o)).toEqual({ ad: 'Dünya' });
  });
});

describe('processJson — minify', () => {
  it('strips all insignificant whitespace/newlines', () => {
    expect(out(processJson({ value: '{ "a": 1, "b": [ 2, 3 ] }', mode: 'minify', indent: '2' }))).toBe(
      '{"a":1,"b":[2,3]}',
    );
  });

  it('minifies a multi-line input to one line', () => {
    const multi = '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}';
    expect(out(processJson({ value: multi, mode: 'minify', indent: '2' }))).toBe(SAMPLE);
  });

  it('indent is ignored in minify mode', () => {
    const a = out(processJson({ value: SAMPLE, mode: 'minify', indent: '4' }));
    const b = out(processJson({ value: SAMPLE, mode: 'minify', indent: 'tab' }));
    expect(a).toBe(b);
    expect(a).toBe(SAMPLE);
  });
});

describe('processJson — invalid JSON (Turkish errors)', () => {
  // Every failure must be a clean Turkish message: either the positioned form
  // OR the fallback. Robust across V8 message-format differences.
  const TR_MESSAGE =
    /^Geçersiz JSON: \d+\. satır, \d+\. sütun civarında sözdizimi hatası\.$|^Geçerli bir JSON girin \(sözdizimi hatası\)\.$/;

  for (const bad of ['{"a":}', '{a:1}', '[1,2,', '{"a":1,}']) {
    it(`rejects ${JSON.stringify(bad)} with a Turkish message`, () => {
      const r = processJson({ value: bad, mode: 'format', indent: '2' });
      expectError(r, JSON_ERROR.INVALID_JSON);
      if (!r.ok) expect(r.error.message).toMatch(TR_MESSAGE);
    });
  }

  it('extracts a line/column when V8 provides a position (unquoted key)', () => {
    // V8 reports a position for "{a:1}"; the Turkish message should carry it.
    const r = processJson({ value: '{a:1}', mode: 'format', indent: '2' });
    if (r.ok) throw new Error('expected failure');
    expect(r.error.message).toMatch(/\d+\. satır, \d+\. sütun/);
  });

  it('computes a multi-line position (error on line 3)', () => {
    const r = processJson({ value: '{\n  "a": 1,\n  "b": x\n}', mode: 'format', indent: '2' });
    if (r.ok) throw new Error('expected failure');
    // Either a positioned message mentioning line 3, or the safe fallback.
    expect(r.error.message).toMatch(
      /^Geçersiz JSON: 3\. satır,|^Geçerli bir JSON girin \(sözdizimi hatası\)\.$/,
    );
  });

  it('rejects empty / whitespace-only input', () => {
    expectError(processJson({ value: '', mode: 'format', indent: '2' }), JSON_ERROR.EMPTY_INPUT);
    expectError(processJson({ value: '   \n ', mode: 'minify', indent: '2' }), JSON_ERROR.EMPTY_INPUT);
  });
});

describe('jsonFormatlaMeta', () => {
  it('exposes the expected registry metadata (no formula)', () => {
    expect(jsonFormatlaMeta.id).toBe('json-formatla');
    expect(jsonFormatlaMeta.slug).toBe('json-formatlayici');
    expect(jsonFormatlaMeta.categoryId).toBe('computer');
    expect(jsonFormatlaMeta.formula).toBeUndefined();
    expect(jsonFormatlaMeta.faq?.length).toBe(2);
  });
});
