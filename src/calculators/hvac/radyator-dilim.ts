/**
 * Radiator panel section count (Radyatör / Petek Dilim Sayısı) — pure logic.
 *
 * Given a heating load (W) — which the user can take from the Isı Kaybı tool —
 * and a panel type, returns the number of panel sections (dilim) needed,
 * rounding UP so the installed output always meets (or exceeds) the load.
 *
 * GROUP-B tool: the per-section output values are COMMON catalog-ish figures for
 * a ~600 mm panel at a 90/70 °C supply regime. Real values come from the
 * manufacturer's catalog and vary with panel height and supply temperature, so
 * the UI carries an "approximate" disclaimer. The values are named consts below
 * so they're auditable in ONE place. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

export type PanelTypeId = 'pk' | 'pkp' | 'pkkp';

export interface PanelType {
  readonly id: PanelTypeId;
  readonly label: string;
  /** Heat output per section (W/dilim) at a 90/70 °C regime — APPROXIMATE. */
  readonly wPerSection: number;
}

/**
 * Common ~600 mm-height panel outputs at 90/70 °C (ΔT ≈ 60 K). Approximate
 * catalog-style figures: actual output depends on the manufacturer, panel
 * height and the real supply/return temperatures.
 */
export const PANEL_TYPES: readonly PanelType[] = [
  { id: 'pk', label: 'PK (tek panel)', wPerSection: 95 },
  { id: 'pkp', label: 'PKP (tek panel + tek konvektör)', wPerSection: 120 },
  { id: 'pkkp', label: 'PKKP (çift panel + çift konvektör)', wPerSection: 170 },
] as const;

/** Loads above this get a friendly "split it up" note (still computed). */
export const HIGH_LOAD_W = 100000;

export interface RadiatorInput {
  /** Heating load in watts. */
  loadW: number;
  panelType: PanelTypeId;
}

export interface RadiatorSuccess {
  /** Required sections, rounded UP. */
  readonly sections: number;
  /** Exact (unrounded) sections, for display. */
  readonly sectionsExact: number;
  /** Per-section output used (W/dilim). */
  readonly wPerSection: number;
  readonly panelLabel: string;
  readonly steps: readonly string[];
  readonly note?: string;
}

export type RadiatorResult = CalcResult<RadiatorSuccess>;

export const RADIATOR_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_LOAD: 'NON_POSITIVE_LOAD',
  INVALID_PANEL_TYPE: 'INVALID_PANEL_TYPE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/** Look up a panel type by id. */
function findPanel(id: PanelTypeId): PanelType | undefined {
  return PANEL_TYPES.find((panel) => panel.id === id);
}

/**
 * Compute the required radiator section count. Pure and total — returns a
 * failure object (never throws) for invalid input.
 */
export function solveRadiator(input: RadiatorInput): RadiatorResult {
  if (!Number.isFinite(input.loadW)) {
    return fail<RadiatorSuccess>(RADIATOR_ERROR.INVALID_NUMBER, 'Geçerli bir ısıtma yükü (W) girin.');
  }
  if (input.loadW <= 0) {
    return fail<RadiatorSuccess>(RADIATOR_ERROR.NON_POSITIVE_LOAD, "Isıtma yükü 0'dan büyük olmalı.");
  }
  const panel = findPanel(input.panelType);
  if (!panel) {
    return fail<RadiatorSuccess>(RADIATOR_ERROR.INVALID_PANEL_TYPE, 'Geçersiz petek tipi.');
  }

  const sectionsExact = input.loadW / panel.wPerSection;
  const sections = Math.ceil(sectionsExact);

  if (!Number.isFinite(sectionsExact) || !Number.isFinite(sections) || sections <= 0) {
    return fail<RadiatorSuccess>(
      RADIATOR_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const note =
    input.loadW > HIGH_LOAD_W
      ? 'Çok yüksek bir yük; tek bir radyatör yerine birden fazla radyatör veya farklı bir ısıtma çözümü gerekebilir.'
      : undefined;

  return {
    ok: true,
    sections,
    sectionsExact,
    wPerSection: panel.wPerSection,
    panelLabel: panel.label,
    ...(note ? { note } : {}),
    steps: [
      `Gerekli dilim: ${fmt(input.loadW)} W ÷ ${panel.wPerSection} W/dilim = ${fmt(sectionsExact)} dilim`,
      `Yukarı yuvarla: ${fmt(sectionsExact)} → ${sections} dilim`,
    ],
  };
}

/** Registry metadata for the radiator section-count calculator. */
export const radyatorDilimMeta: Calculator = {
  id: 'radyator-dilim',
  slug: 'radyator-dilim-hesaplama',
  categoryId: 'hvac',
  title: 'Radyatör (Petek) Dilim Hesaplama',
  description:
    'Isıtma yüküne ve petek tipine (PK, PKP, PKKP) göre gereken radyatör dilim sayısını hesaplayın. Değerler yaklaşıktır.',
  keywords: [
    'radyatör dilim hesaplama',
    'petek dilim hesabı',
    'kaç dilim radyatör',
    'pkkp dilim hesaplama',
    'radyatör hesaplama',
    'petek sayısı hesaplama',
  ],
  relatedTools: ['isi-kaybi', 'su-isitma-gucu'],
  faq: [
    {
      question: 'Kaç dilim radyatör gerekir?',
      answer:
        'Gereken dilim sayısı, mekânın ısıtma yükü (W) bir dilimin verdiği ısıya (W/dilim) bölünüp yukarı yuvarlanarak bulunur. Örneğin 2000 W yük ve dilim başına 170 W veren bir PKKP petek için 2000 ÷ 170 ≈ 11,8 → 12 dilim gerekir. Dilim başına değerler yaklaşıktır; gerçek değer üreticiye, panel yüksekliğine ve gidiş/dönüş sıcaklığına göre değişir.',
    },
    {
      question: 'Petek tipleri (PK, PKP, PKKP) arasındaki fark nedir?',
      answer:
        'Harfler panel ve konvektör sayısını gösterir: PK tek panel, PKP tek panel + tek konvektör, PKKP ise çift panel + çift konvektördür. Daha fazla panel ve konvektör, aynı boyda daha fazla ısı yüzeyi demektir; bu yüzden dilim başına ısı gücü (W/dilim) PK < PKP < PKKP sırasıyla artar ve aynı yük için daha az dilim gerekir. Buradaki değerler 90/70 °C için yaklaşık kabul edilmiştir.',
    },
  ],
};
