/**
 * Data size converter (Veri Boyutu Dönüştürücü) — pure logic.
 *
 * Converts between three DELIBERATELY SEPARATE unit systems — never conflated:
 *   • Decimal / SI   (powers of 1000): B, kB, MB, GB, TB, PB
 *   • Binary / IEC   (powers of 1024): KiB, MiB, GiB, TiB, PiB
 *   • Bit            (1 byte = 8 bits): bit, kbit, Mbit, Gbit
 *
 * Everything is modelled internally in BITS (the canonical base): each unit
 * carries `factorInBits` = how many bits one of it equals. The value is parsed
 * as a Number (fractional inputs allowed) and each output is formatted cleanly
 * (full precision for integers, ~7 significant figures otherwise, no scientific
 * notation, no float noise). No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export interface DataUnit {
  /** Stable id used by the UI dropdown and lookups. */
  readonly id: string;
  /** Turkish-friendly label, e.g. "Megabayt (MB)". */
  readonly label: string;
  /** How many BITS one of this unit equals. */
  readonly factorInBits: number;
}

/**
 * Every supported unit (single source of truth for the dropdown). Bytes first,
 * then IEC binary, then bit units. 1 byte = 8 bits underpins every factor.
 */
export const DATA_UNITS = [
  { id: 'B', label: 'Bayt (B)', factorInBits: 8 },
  { id: 'kB', label: 'Kilobayt (kB)', factorInBits: 8e3 },
  { id: 'MB', label: 'Megabayt (MB)', factorInBits: 8e6 },
  { id: 'GB', label: 'Gigabayt (GB)', factorInBits: 8e9 },
  { id: 'TB', label: 'Terabayt (TB)', factorInBits: 8e12 },
  { id: 'PB', label: 'Petabayt (PB)', factorInBits: 8e15 },
  { id: 'KiB', label: 'Kibibayt (KiB)', factorInBits: 8 * 2 ** 10 },
  { id: 'MiB', label: 'Mebibayt (MiB)', factorInBits: 8 * 2 ** 20 },
  { id: 'GiB', label: 'Gibibayt (GiB)', factorInBits: 8 * 2 ** 30 },
  { id: 'TiB', label: 'Tebibayt (TiB)', factorInBits: 8 * 2 ** 40 },
  { id: 'PiB', label: 'Pebibayt (PiB)', factorInBits: 8 * 2 ** 50 },
  { id: 'bit', label: 'Bit', factorInBits: 1 },
  { id: 'kbit', label: 'Kilobit (kbit)', factorInBits: 1e3 },
  { id: 'Mbit', label: 'Megabit (Mbit)', factorInBits: 1e6 },
  { id: 'Gbit', label: 'Gigabit (Gbit)', factorInBits: 1e9 },
] as const satisfies readonly DataUnit[];

/** Output rows are grouped by system, each referencing units by id. */
const OUTPUT_GROUPS = [
  { system: 'Ondalık (SI)', unitIds: ['B', 'kB', 'MB', 'GB', 'TB'] },
  { system: 'İkilik (IEC)', unitIds: ['KiB', 'MiB', 'GiB', 'TiB'] },
  { system: 'Bit', unitIds: ['bit', 'Mbit', 'Gbit'] },
] as const;

export interface DataRow {
  readonly label: string;
  readonly value: string;
}

export interface DataGroup {
  readonly system: string;
  readonly rows: readonly DataRow[];
}

export interface DataSizeSuccess {
  readonly groups: readonly DataGroup[];
  /** Canonical total in bits (handy for captions / debugging). */
  readonly bitsTotal: number;
}

export type DataSizeResult = CalcResult<DataSizeSuccess>;

export interface DataSizeInput {
  value: string | number;
  fromUnitId: string;
}

export const DATA_SIZE_ERROR = {
  /** Empty / whitespace-only input. */
  INVALID_INPUT: 'INVALID_INPUT',
  /** Non-numeric / non-finite input. */
  INVALID_NUMBER: 'INVALID_NUMBER',
  /** A negative value (out of scope). */
  NEGATIVE: 'NEGATIVE',
  /** fromUnitId does not match any known unit. */
  UNKNOWN_UNIT: 'UNKNOWN_UNIT',
} as const;

const UNIT_BY_ID = new Map<string, DataUnit>(DATA_UNITS.map((u) => [u.id, u]));

/**
 * Format a value cleanly: exact integers at full precision, otherwise ~7
 * significant figures via fixed notation (never scientific), trailing zeros
 * trimmed, float noise rounded away.
 */
export function formatDataValue(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (Number.isInteger(n) && abs < 1e21) return String(n);

  // ~7 significant figures, expressed as fixed decimals so we never emit an
  // exponent. decimals = 7 - 1 - floor(log10(abs)), clamped to a sane range.
  const exp = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, Math.min(100, 7 - 1 - exp));
  let s = n.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

/**
 * Convert a data size between every supported unit. Pure and total — returns a
 * failure object (never throws) for any invalid input.
 */
export function convertDataSize(input: DataSizeInput): DataSizeResult {
  const unit = UNIT_BY_ID.get(input.fromUnitId);
  if (!unit) {
    return fail<DataSizeSuccess>(
      DATA_SIZE_ERROR.UNKNOWN_UNIT,
      'Geçersiz birim seçildi.',
    );
  }

  const raw = typeof input.value === 'number' ? String(input.value) : input.value;
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') {
    return fail<DataSizeSuccess>(DATA_SIZE_ERROR.INVALID_INPUT, 'Bir değer girin.');
  }

  // Accept a Turkish decimal comma. Number() handles the rest.
  const n = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(n)) {
    return fail<DataSizeSuccess>(DATA_SIZE_ERROR.INVALID_NUMBER, 'Geçerli bir sayı girin.');
  }
  if (n < 0) {
    return fail<DataSizeSuccess>(DATA_SIZE_ERROR.NEGATIVE, 'Negatif değer girilemez.');
  }

  const bitsTotal = n * unit.factorInBits;

  const groups: DataGroup[] = OUTPUT_GROUPS.map((group) => ({
    system: group.system,
    rows: group.unitIds.map((id) => {
      const target = UNIT_BY_ID.get(id)!; // ids are from DATA_UNITS by construction
      return { label: target.label, value: formatDataValue(bitsTotal / target.factorInBits) };
    }),
  }));

  return { ok: true, groups, bitsTotal };
}

/** Registry metadata for the data size converter. */
export const veriBoyutuMeta: Calculator = {
  id: 'veri-boyutu',
  slug: 'veri-boyutu-donusturucu',
  categoryId: 'computer',
  title: 'Veri Boyutu Dönüştürücü',
  description:
    'Bayt, KB, MB, GB ile KiB, MiB, GiB (ikilik) ve bit birimleri arasında dönüşüm yapın.',
  keywords: [
    'veri boyutu dönüştürücü',
    'mb gb dönüştürme',
    'kb to mb',
    'byte hesaplama',
    'kib mib gib',
    'bit byte dönüşümü',
  ],
  relatedTools: ['sayi-tabani', 'ip-subnet'],
  faq: [
    {
      question: 'MB ile MiB arasındaki fark nedir?',
      answer:
        'MB (megabayt) ondalık (SI) bir birimdir ve 1.000.000 bayttır (10^6). MiB (mebibayt) ise ikilik bir birimdir ve 1.048.576 bayttır (2^20) — yani yaklaşık 1,049 MB. İşletim sistemleri (özellikle Windows) çoğu zaman MiB değerini "MB" etiketiyle gösterir; bu yüzden bir diskin kapasitesi üreticinin yazdığından daha küçük görünebilir.',
    },
    {
      question: '1 GB kaç MB’tır?',
      answer:
        'Ondalık (SI) sistemde 1 GB = 1000 MB’tır. İkilik (IEC) sistemde ise 1 GiB = 1024 MiB’tir. Karışıklık çoğunlukla bu iki sistemin birbirine karıştırılmasından kaynaklanır: "1024" çarpanı ikilik (KiB/MiB/GiB) birimlere, "1000" çarpanı ondalık (kB/MB/GB) birimlere aittir.',
    },
  ],
};
