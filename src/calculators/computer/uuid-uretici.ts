/**
 * UUID generator — pure validation + batch STRUCTURING. The actual UUIDs come
 * from crypto.randomUUID() in the island; the engine's testable surface is a
 * UUID-v4 validator and a batch helper that takes an INJECTED generator (so it
 * is reproducible/unit-testable). No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export const UUID_COUNT_MIN = 1;
export const UUID_COUNT_MAX = 50;

/** Canonical UUID v4: 8-4-4-4-12 hex, version nibble 4, variant nibble [89ab]. */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True if `value` is a canonical version-4 UUID string. */
export function isValidUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value.trim());
}

/** Injected UUID source (the island passes crypto.randomUUID). */
export type UuidGenerator = () => string;

export interface UuidSuccess {
  readonly uuids: readonly string[];
}

export type UuidResult = CalcResult<UuidSuccess>;

export const UUID_ERROR = {
  /** count not an integer within [1, 50]. */
  COUNT_RANGE: 'COUNT_RANGE',
  /** The injected generator produced a non-v4 string (defensive). */
  INVALID_UUID: 'INVALID_UUID',
} as const;

/**
 * Produce `count` UUIDs using the injected generator, validating each. Pure and
 * total — returns a failure for an out-of-range count or an invalid generated
 * UUID.
 */
export function generateUuids(count: number, generate: UuidGenerator): UuidResult {
  if (!Number.isInteger(count) || count < UUID_COUNT_MIN || count > UUID_COUNT_MAX) {
    return fail<UuidSuccess>(
      UUID_ERROR.COUNT_RANGE,
      `UUID sayısı ${UUID_COUNT_MIN} ile ${UUID_COUNT_MAX} arasında bir tam sayı olmalıdır.`,
    );
  }

  const uuids: string[] = [];
  for (let i = 0; i < count; i++) {
    const uuid = generate();
    if (!isValidUuidV4(uuid)) {
      return fail<UuidSuccess>(UUID_ERROR.INVALID_UUID, 'Geçersiz UUID üretildi.');
    }
    uuids.push(uuid);
  }
  return { ok: true, uuids };
}

/** Registry metadata for the UUID generator. */
export const uuidUreticiMeta: Calculator = {
  id: 'uuid-uretici',
  slug: 'uuid-uretici',
  categoryId: 'computer',
  title: 'UUID Üreteci',
  description: 'Rastgele UUID (v4) değerleri oluşturun ve kopyalayın.',
  keywords: [
    'uuid üretici',
    'uuid oluşturma',
    'guid üretici',
    'rastgele uuid',
    'uuid v4',
  ],
  relatedTools: ['sifre-uretici', 'hash'],
  faq: [
    {
      question: 'UUID nedir, nerede kullanılır?',
      answer:
        'UUID (Evrensel Benzersiz Tanımlayıcı), 128 bitlik, neredeyse hiçbir zaman çakışmayan bir kimliktir ve 8-4-4-4-12 düzeninde 32 onaltılık karakterle yazılır (örn. 550e8400-e29b-41d4-a716-446655440000). Merkezi bir numaralandırıcıya ihtiyaç duymadan benzersiz kimlik gerektiren her yerde kullanılır: veritabanı kayıtları, API anahtarları, dosya/işlem adları, dağıtık sistemler.',
    },
    {
      question: 'UUID v4 nedir?',
      answer:
        'UUID v4, neredeyse tamamen rastgele üretilen UUID sürümüdür. Sürüm bilgisini taşıyan bir hane her zaman “4”, varyant hanesi ise 8, 9, a veya b olur; geri kalan haneler rastgeledir. Bu rastgelelik sayesinde merkezi bir koordinasyon olmadan bile pratikte benzersizdir.',
    },
  ],
};
