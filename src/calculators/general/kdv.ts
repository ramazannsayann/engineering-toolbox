/**
 * VAT calculator (KDV) — pure logic. Adds VAT to a net amount, or extracts VAT
 * from a gross (VAT-inclusive) amount, at the current Turkish rates (or a custom
 * rate). Amounts are money → non-negative. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export type VatDirection = 'add' | 'extract';

/** Preset Turkish VAT rates (current standard rates; rates can change). */
export const KDV_RATES = [
  { id: '20', label: '%20', rate: 20 },
  { id: '10', label: '%10', rate: 10 },
  { id: '1', label: '%1', rate: 1 },
] as const satisfies readonly { id: string; label: string; rate: number }[];

export interface VatInput {
  amount: number;
  /** VAT rate in percent, 0–100. */
  rate: number;
  direction: VatDirection;
}

export interface VatSuccess {
  /** Net (KDV hariç) amount. */
  readonly net: number;
  /** VAT (KDV) amount. */
  readonly kdv: number;
  /** Gross (KDV dahil) amount. */
  readonly gross: number;
  readonly rate: number;
  readonly direction: VatDirection;
  readonly steps: readonly string[];
}

export type VatResult = CalcResult<VatSuccess>;

export const VAT_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NEGATIVE_AMOUNT: 'NEGATIVE_AMOUNT',
  RATE_RANGE: 'RATE_RANGE',
  INVALID_DIRECTION: 'INVALID_DIRECTION',
} as const;

function fmtMoney(n: number): string {
  return parseFloat(n.toFixed(6)).toString();
}

/**
 * Add or extract VAT. Pure and total — returns a failure for a non-finite or
 * negative amount, a rate outside [0,100], or an invalid direction.
 */
export function convertVat(input: VatInput): VatResult {
  const { amount, rate, direction } = input;

  if (!Number.isFinite(amount)) {
    return fail<VatSuccess>(VAT_ERROR.INVALID_NUMBER, 'Geçerli bir tutar girin.');
  }
  if (amount < 0) {
    return fail<VatSuccess>(VAT_ERROR.NEGATIVE_AMOUNT, 'Tutar negatif olamaz.');
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return fail<VatSuccess>(VAT_ERROR.RATE_RANGE, 'KDV oranı %0 ile %100 arasında olmalıdır.');
  }
  if (direction !== 'add' && direction !== 'extract') {
    return fail<VatSuccess>(VAT_ERROR.INVALID_DIRECTION, 'Geçersiz yön.');
  }

  let net: number;
  let kdv: number;
  let gross: number;
  if (direction === 'add') {
    net = amount;
    kdv = amount * (rate / 100);
    gross = amount + kdv;
  } else {
    gross = amount;
    net = amount / (1 + rate / 100);
    kdv = gross - net;
  }

  const steps =
    direction === 'add'
      ? [
          `KDV tutarı: ${fmtMoney(net)} × (${rate} / 100) = ${fmtMoney(kdv)}`,
          `KDV dahil: ${fmtMoney(net)} + ${fmtMoney(kdv)} = ${fmtMoney(gross)}`,
        ]
      : [
          `KDV hariç: ${fmtMoney(gross)} / (1 + ${rate} / 100) = ${fmtMoney(net)}`,
          `KDV tutarı: ${fmtMoney(gross)} − ${fmtMoney(net)} = ${fmtMoney(kdv)}`,
        ];

  return { ok: true, net, kdv, gross, rate, direction, steps };
}

/** Registry metadata for the VAT (KDV) calculator. */
export const kdvMeta: Calculator = {
  id: 'kdv-hesaplama',
  slug: 'kdv-hesaplama',
  categoryId: 'general',
  title: 'KDV Hesaplama',
  description:
    "KDV hariç tutara KDV ekleyin veya KDV dahil tutardan KDV'yi ayırın (%20, %10, %1).",
  keywords: [
    'kdv hesaplama',
    'kdv dahil hariç',
    'kdv ayırma',
    'yüzde 20 kdv',
    'kdv hesaplama nasıl yapılır',
    'katma değer vergisi hesaplama',
  ],
  relatedTools: ['yuzde-hesaplama', 'agirlik-donusturucu'],
  faq: [
    {
      question: "KDV dahil tutardan KDV nasıl ayrılır?",
      answer:
        'KDV dahil (brüt) tutardan KDV hariç (net) tutarı bulmak için brüt tutar (1 + oran/100) değerine bölünür. Örneğin %20 KDV için 120 TL’lik brüt tutar 120 / 1,20 = 100 TL net eder; aradaki 20 TL KDV’dir.',
    },
    {
      question: "Türkiye'de KDV oranları nedir?",
      answer:
        'Türkiye’de genel KDV oranı %20’dir. Bazı ürün ve hizmetlerde indirimli %10 ve %1 oranları uygulanır. KDV oranları zamanla değişebilir; bu hesaplayıcı güncel standart oranları yansıtır, kesin oran için resmi kaynakları kontrol edin.',
    },
  ],
};
