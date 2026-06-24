/**
 * IPv4 IP / Subnet (CIDR) calculator — pure logic.
 *
 * From an IPv4 address + a CIDR prefix (/0–/32), derive the network, broadcast,
 * usable host range, address counts, subnet/wildcard masks, address class and
 * type (private/public/loopback/…).
 *
 * JS bitwise ops are SIGNED 32-bit, so every result is coerced to unsigned with
 * `>>> 0`, and the mask special-cases prefix 0 (shifting by 32 is undefined in
 * JS and `0xFFFFFFFF << 0` would stay all-ones). The entered address need not be
 * the network address — host bits are zeroed to find it. IPv4 only. No
 * React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export interface SubnetInput {
  ip: string;
  /** CIDR prefix length, 0–32. */
  prefix: number;
}

export interface SubnetRow {
  readonly label: string;
  readonly value: string;
}

export interface SubnetSuccess {
  readonly rows: readonly SubnetRow[];
  /** Extra explanations for the /31 and /32 special cases (may be empty). */
  readonly notes: readonly string[];
}

export type SubnetResult = CalcResult<SubnetSuccess>;

export const IP_SUBNET_ERROR = {
  /** Empty IP field. */
  EMPTY_INPUT: 'EMPTY_INPUT',
  /** Malformed IPv4 (wrong octet count, non-numeric, octet out of 0–255). */
  INVALID_IP: 'INVALID_IP',
  /** Prefix not an integer in 0–32. */
  INVALID_PREFIX: 'INVALID_PREFIX',
} as const;

/** Parse a dotted-quad into 4 octets, or null if malformed. */
function parseIpv4(raw: string): number[] | null {
  const parts = raw.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null; // empty / non-numeric octet
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

/** Pack 4 octets into an unsigned 32-bit integer. */
function octetsToInt(o: number[]): number {
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

/** Render an unsigned 32-bit integer as a dotted-quad. */
function intToDotted(x: number): string {
  return `${(x >>> 24) & 255}.${(x >>> 16) & 255}.${(x >>> 8) & 255}.${x & 255}`;
}

/** Address class A–E by the first octet. */
function addressClass(first: number): string {
  if (first <= 127) return 'A';
  if (first <= 191) return 'B';
  if (first <= 223) return 'C';
  if (first <= 239) return 'D';
  return 'E';
}

/** Short Turkish descriptor for the address type (RFC 1918 etc.). */
function addressType(o: number[]): string {
  const a = o[0];
  const b = o[1];
  if (a === 127) return 'Geri döngü (Loopback)';
  if (a === 10) return 'Özel (RFC 1918)';
  if (a === 172 && b >= 16 && b <= 31) return 'Özel (RFC 1918)';
  if (a === 192 && b === 168) return 'Özel (RFC 1918)';
  if (a === 169 && b === 254) return 'Bağlantı-yerel (APIPA)';
  if (a >= 224 && a <= 239) return 'Çok noktaya yayın (Multicast)';
  if (a >= 240) return 'Ayrılmış (Sınıf E)';
  return 'Genel (Public)';
}

/**
 * Compute the full subnet breakdown. Pure and total — returns a failure object
 * (never throws) for any invalid input.
 */
export function calculateSubnet(input: SubnetInput): SubnetResult {
  const rawIp = (input.ip ?? '').trim();
  if (rawIp === '') {
    return fail<SubnetSuccess>(IP_SUBNET_ERROR.EMPTY_INPUT, 'Bir IP adresi girin.');
  }

  const octets = parseIpv4(rawIp);
  if (!octets) {
    return fail<SubnetSuccess>(
      IP_SUBNET_ERROR.INVALID_IP,
      'Geçerli bir IPv4 adresi girin (örn. 192.168.1.10).',
    );
  }

  const prefix = input.prefix;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return fail<SubnetSuccess>(
      IP_SUBNET_ERROR.INVALID_PREFIX,
      'CIDR öneki 0 ile 32 arasında olmalıdır.',
    );
  }

  const ipInt = octetsToInt(octets);
  // prefix 0 must be special-cased: `0xFFFFFFFF << 32` is undefined in JS.
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const networkInt = (ipInt & mask) >>> 0;
  const wildcard = ~mask >>> 0;
  const broadcastInt = (networkInt | wildcard) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);

  let usableHosts: number;
  let firstHostInt: number;
  let lastHostInt: number;
  const notes: string[] = [];

  if (prefix === 32) {
    // Single host: the address is both network and broadcast.
    usableHosts = 1;
    firstHostInt = ipInt;
    lastHostInt = ipInt;
    notes.push(
      '/32 tek bir host’u (ana makineyi) tanımlar; ağ ve broadcast adresi bu adresle aynıdır.',
    );
  } else if (prefix === 31) {
    // RFC 3021 point-to-point: both addresses are usable, no net/broadcast split.
    usableHosts = 2;
    firstHostInt = networkInt;
    lastHostInt = broadcastInt; // network + 1
    notes.push(
      'RFC 3021: /31 ağı noktadan-noktaya bağlantılar içindir; ağ/broadcast ayrımı yoktur, her iki adres de kullanılabilir (2 host).',
    );
  } else {
    usableHosts = totalAddresses - 2;
    firstHostInt = networkInt + 1;
    lastHostInt = broadcastInt - 1;
  }

  const rangeStr =
    firstHostInt === lastHostInt
      ? intToDotted(firstHostInt)
      : `${intToDotted(firstHostInt)} – ${intToDotted(lastHostInt)}`;

  const rows: SubnetRow[] = [
    { label: 'Ağ Adresi', value: intToDotted(networkInt) },
    { label: 'Broadcast Adresi', value: intToDotted(broadcastInt) },
    { label: 'Kullanılabilir Aralık', value: rangeStr },
    { label: 'Toplam Adres', value: String(totalAddresses) },
    { label: 'Kullanılabilir Host', value: String(usableHosts) },
    { label: 'Alt Ağ Maskesi', value: intToDotted(mask) },
    { label: 'Wildcard Maskesi', value: intToDotted(wildcard) },
    { label: 'CIDR', value: `/${prefix}` },
    { label: 'Sınıf', value: addressClass(octets[0]) },
    { label: 'Tür', value: addressType(octets) },
  ];

  return { ok: true, rows, notes };
}

/** Registry metadata for the IP / subnet calculator. */
export const ipSubnetMeta: Calculator = {
  id: 'ip-subnet',
  slug: 'ip-subnet-hesaplayici',
  categoryId: 'computer',
  title: 'IP / Subnet Hesaplayıcı',
  description:
    "IPv4 adresi ve CIDR önekinden ağ adresini, broadcast'i, host aralığını ve alt ağ maskesini hesaplayın.",
  keywords: [
    'ip subnet hesaplama',
    'cidr hesaplama',
    'subnet hesaplayıcı',
    'alt ağ maskesi hesaplama',
    'ip aralığı hesaplama',
    'network broadcast hesaplama',
  ],
  relatedTools: ['sayi-tabani', 'veri-boyutu'],
  faq: [
    {
      question: 'CIDR (/24) ne anlama gelir?',
      answer:
        'CIDR öneki, IP adresinin kaç bitinin "ağ" kısmı olduğunu belirtir. /24, ilk 24 bitin ağ adresini, kalan 8 bitin host adreslerini gösterdiği anlamına gelir; bu da 256 adres (254 kullanılabilir host) ve 255.255.255.0 alt ağ maskesi demektir. Önek büyüdükçe (örn. /25, /26) ağ küçülür, host sayısı azalır.',
    },
    {
      question: 'Ağ adresi ve broadcast adresi nedir?',
      answer:
        'Ağ adresi, bir alt ağdaki host bitlerinin tümü 0 olan ilk adrestir ve ağın kendisini tanımlar. Broadcast adresi ise host bitlerinin tümü 1 olan son adrestir ve o ağdaki tüm cihazlara aynı anda veri göndermek için kullanılır. Bu ikisi host olarak atanamaz; bu nedenle kullanılabilir host sayısı toplam adresten 2 eksiktir (/31 ve /32 istisnadır).',
    },
  ],
};
