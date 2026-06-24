/**
 * JSON formatter / minifier — pure logic.
 *
 * Validates + normalizes JSON via JSON.parse, then re-serializes either pretty
 * (indented) or minified. The value-add is GOOD error reporting: JSON.parse
 * throws a terse English SyntaxError, which we translate to a clear Turkish
 * message and, when extractable, a line/column. Engine-pure (JSON is a standard
 * global) — no React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export type JsonMode = 'format' | 'minify';
export type JsonIndent = '2' | '4' | 'tab';

/** Mode options for the UI. */
export const JSON_MODES = [
  { id: 'format', label: 'Formatla' },
  { id: 'minify', label: 'Küçült' },
] as const satisfies readonly { id: JsonMode; label: string }[];

/** Indent options for the UI (used only in format mode). */
export const JSON_INDENTS = [
  { id: '2', label: '2 boşluk' },
  { id: '4', label: '4 boşluk' },
  { id: 'tab', label: 'Tab' },
] as const satisfies readonly { id: JsonIndent; label: string }[];

export interface JsonInput {
  value: string;
  mode: JsonMode;
  indent: JsonIndent;
}

export interface JsonSuccess {
  readonly output: string;
  readonly mode: JsonMode;
}

export type JsonResult = CalcResult<JsonSuccess>;

export const JSON_ERROR = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_JSON: 'INVALID_JSON',
} as const;

/** Count newlines up to `position` to derive a 1-based line & column. */
function positionToLineColumn(source: string, position: number): {
  line: number;
  column: number;
} {
  let line = 1;
  let column = 1;
  const limit = Math.min(position, source.length);
  for (let i = 0; i < limit; i++) {
    if (source[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/**
 * Best-effort line/column from a SyntaxError message, defensively across engine
 * wordings: newer V8 includes "(line L column C)"; older V8 includes
 * "at position N". Returns null if neither is present.
 */
function extractPosition(
  message: string,
  source: string,
): { line: number; column: number } | null {
  const lineCol = message.match(/line (\d+) column (\d+)/i);
  if (lineCol) {
    return { line: Number(lineCol[1]), column: Number(lineCol[2]) };
  }
  const pos = message.match(/position (\d+)/i);
  if (pos) {
    return positionToLineColumn(source, Number(pos[1]));
  }
  return null;
}

/**
 * Format or minify a JSON string. Pure and total — returns a failure object
 * (never throws) for empty/invalid input.
 */
export function processJson(input: JsonInput): JsonResult {
  if (input.value.trim() === '') {
    return fail<JsonSuccess>(JSON_ERROR.EMPTY_INPUT, 'Dönüştürülecek JSON girin.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const pos = extractPosition(message, input.value);
    if (pos) {
      return fail<JsonSuccess>(
        JSON_ERROR.INVALID_JSON,
        `Geçersiz JSON: ${pos.line}. satır, ${pos.column}. sütun civarında sözdizimi hatası.`,
      );
    }
    return fail<JsonSuccess>(
      JSON_ERROR.INVALID_JSON,
      'Geçerli bir JSON girin (sözdizimi hatası).',
    );
  }

  const output =
    input.mode === 'minify'
      ? JSON.stringify(parsed)
      : JSON.stringify(parsed, null, input.indent === 'tab' ? '\t' : Number(input.indent));

  return { ok: true, output, mode: input.mode };
}

/** Registry metadata for the JSON formatter/minifier. */
export const jsonFormatlaMeta: Calculator = {
  id: 'json-formatla',
  slug: 'json-formatlayici',
  categoryId: 'computer',
  title: 'JSON Formatlayıcı / Küçültücü',
  description:
    'JSON metnini okunabilir biçimde formatlayın (girintili) veya tek satıra küçültün; sözdizimi hatalarını Türkçe görün.',
  keywords: [
    'json formatlama',
    'json güzelleştirme',
    'json formatter',
    'json minify',
    'json düzenleyici',
    'json doğrulama',
  ],
  relatedTools: ['base64', 'url-encode', 'hash'],
  faq: [
    {
      question: 'JSON formatlama (beautify) ne işe yarar?',
      answer:
        'Formatlama, sıkıştırılmış veya düzensiz bir JSON metnini girintilerle (boşluk/tab) ve satır sonlarıyla okunabilir hale getirir. Verinin yapısını (nesneler, diziler, iç içe alanlar) görmeyi, hata ayıklamayı ve gözle doğrulamayı kolaylaştırır. İçerik değişmez; yalnızca boşluk düzeni değişir.',
    },
    {
      question: 'JSON minify (küçültme) nedir?',
      answer:
        'Küçültme, JSON’daki gereksiz boşlukları ve satır sonlarını kaldırarak veriyi tek satıra indirir. Böylece dosya boyutu küçülür ve ağ üzerinden daha hızlı taşınır; özellikle API yanıtları ve üretim ortamı için kullanışlıdır. Veri içeriği yine aynı kalır.',
    },
  ],
};
