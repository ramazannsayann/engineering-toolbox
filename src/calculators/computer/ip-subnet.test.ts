import { describe, it, expect } from 'vitest';
import {
  calculateSubnet,
  ipSubnetMeta,
  IP_SUBNET_ERROR,
  type SubnetResult,
} from './ip-subnet';

function expectError(result: SubnetResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

/** Look up a row value by its label. */
function row(result: SubnetResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  const found = result.rows.find((r) => r.label === label);
  if (!found) throw new Error(`no row "${label}"`);
  return found.value;
}

describe('calculateSubnet — anchors', () => {
  it('192.168.1.10/24 → net .0, bc .255, range .1–.254, 256/254, mask 255.255.255.0, class C, private', () => {
    const r = calculateSubnet({ ip: '192.168.1.10', prefix: 24 });
    expect(r.ok).toBe(true);
    expect(row(r, 'Ağ Adresi')).toBe('192.168.1.0'); // host bits zeroed
    expect(row(r, 'Broadcast Adresi')).toBe('192.168.1.255'); // host bits set
    expect(row(r, 'Kullanılabilir Aralık')).toBe('192.168.1.1 – 192.168.1.254');
    expect(row(r, 'Toplam Adres')).toBe('256'); // 2^(32-24)
    expect(row(r, 'Kullanılabilir Host')).toBe('254'); // 256 - 2
    expect(row(r, 'Alt Ağ Maskesi')).toBe('255.255.255.0');
    expect(row(r, 'Wildcard Maskesi')).toBe('0.0.0.255');
    expect(row(r, 'CIDR')).toBe('/24');
    expect(row(r, 'Sınıf')).toBe('C');
    expect(row(r, 'Tür')).toBe('Özel (RFC 1918)');
  });

  it('10.0.0.0/8 → bc 10.255.255.255, total 16777216, usable 16777214, mask 255.0.0.0, private', () => {
    const r = calculateSubnet({ ip: '10.0.0.0', prefix: 8 });
    expect(row(r, 'Broadcast Adresi')).toBe('10.255.255.255');
    expect(row(r, 'Toplam Adres')).toBe('16777216'); // 2^24
    expect(row(r, 'Kullanılabilir Host')).toBe('16777214');
    expect(row(r, 'Alt Ağ Maskesi')).toBe('255.0.0.0');
    expect(row(r, 'Tür')).toBe('Özel (RFC 1918)');
  });

  it('172.20.5.30/16 → net 172.20.0.0, bc 172.20.255.255, private (172.16/12)', () => {
    const r = calculateSubnet({ ip: '172.20.5.30', prefix: 16 });
    expect(row(r, 'Ağ Adresi')).toBe('172.20.0.0');
    expect(row(r, 'Broadcast Adresi')).toBe('172.20.255.255');
    expect(row(r, 'Tür')).toBe('Özel (RFC 1918)');
  });

  it('8.8.8.8/32 → single host (usable 1, first=last), public, class A, note present', () => {
    const r = calculateSubnet({ ip: '8.8.8.8', prefix: 32 });
    expect(row(r, 'Kullanılabilir Host')).toBe('1');
    expect(row(r, 'Kullanılabilir Aralık')).toBe('8.8.8.8'); // first === last
    expect(row(r, 'Ağ Adresi')).toBe('8.8.8.8');
    expect(row(r, 'Sınıf')).toBe('A'); // first octet 8 ≤ 127
    expect(row(r, 'Tür')).toBe('Genel (Public)');
    if (r.ok) expect(r.notes.length).toBeGreaterThan(0);
  });

  it('192.168.1.0/31 → RFC 3021: usable 2 (.0 and .1), note present', () => {
    const r = calculateSubnet({ ip: '192.168.1.0', prefix: 31 });
    expect(row(r, 'Kullanılabilir Host')).toBe('2');
    expect(row(r, 'Kullanılabilir Aralık')).toBe('192.168.1.0 – 192.168.1.1');
    if (r.ok) expect(r.notes.some((n) => /RFC 3021/.test(n))).toBe(true);
  });

  it('192.0.2.1/24 → public; class C', () => {
    const r = calculateSubnet({ ip: '192.0.2.1', prefix: 24 });
    expect(row(r, 'Tür')).toBe('Genel (Public)'); // 192.0.x is NOT 192.168
    expect(row(r, 'Sınıf')).toBe('C');
  });

  it('boundary /0 → mask 0.0.0.0, total 2^32, wildcard 255.255.255.255', () => {
    const r = calculateSubnet({ ip: '192.168.1.10', prefix: 0 });
    expect(row(r, 'Alt Ağ Maskesi')).toBe('0.0.0.0');
    expect(row(r, 'Wildcard Maskesi')).toBe('255.255.255.255');
    expect(row(r, 'Ağ Adresi')).toBe('0.0.0.0');
    expect(row(r, 'Toplam Adres')).toBe('4294967296'); // 2^32
    expect(row(r, 'Kullanılabilir Host')).toBe('4294967294');
  });

  it('boundary /30 → usable 2', () => {
    const r = calculateSubnet({ ip: '192.168.1.4', prefix: 30 });
    expect(row(r, 'Toplam Adres')).toBe('4');
    expect(row(r, 'Kullanılabilir Host')).toBe('2'); // 4 - 2
    expect(row(r, 'Ağ Adresi')).toBe('192.168.1.4');
    expect(row(r, 'Broadcast Adresi')).toBe('192.168.1.7');
  });

  it('127.0.0.1/8 → loopback; 169.254.1.1/16 → link-local', () => {
    expect(row(calculateSubnet({ ip: '127.0.0.1', prefix: 8 }), 'Tür')).toBe('Geri döngü (Loopback)');
    expect(row(calculateSubnet({ ip: '169.254.1.1', prefix: 16 }), 'Tür')).toBe(
      'Bağlantı-yerel (APIPA)',
    );
  });
});

describe('calculateSubnet — invalid input', () => {
  it('rejects an octet > 255', () => {
    expectError(calculateSubnet({ ip: '256.1.1.1', prefix: 24 }), IP_SUBNET_ERROR.INVALID_IP);
  });
  it('rejects too few octets', () => {
    expectError(calculateSubnet({ ip: '1.2.3', prefix: 24 }), IP_SUBNET_ERROR.INVALID_IP);
  });
  it('rejects too many octets / trailing dot', () => {
    expectError(calculateSubnet({ ip: '1.2.3.4.5', prefix: 24 }), IP_SUBNET_ERROR.INVALID_IP);
    expectError(calculateSubnet({ ip: '1.2.3.', prefix: 24 }), IP_SUBNET_ERROR.INVALID_IP);
  });
  it('rejects non-numeric input', () => {
    expectError(calculateSubnet({ ip: 'abc', prefix: 24 }), IP_SUBNET_ERROR.INVALID_IP);
  });
  it('rejects a prefix outside 0–32 or non-integer', () => {
    expectError(calculateSubnet({ ip: '192.168.1.1', prefix: 33 }), IP_SUBNET_ERROR.INVALID_PREFIX);
    expectError(calculateSubnet({ ip: '192.168.1.1', prefix: -1 }), IP_SUBNET_ERROR.INVALID_PREFIX);
    expectError(calculateSubnet({ ip: '192.168.1.1', prefix: 24.5 }), IP_SUBNET_ERROR.INVALID_PREFIX);
  });
  it('rejects empty input', () => {
    expectError(calculateSubnet({ ip: '', prefix: 24 }), IP_SUBNET_ERROR.EMPTY_INPUT);
    expectError(calculateSubnet({ ip: '   ', prefix: 24 }), IP_SUBNET_ERROR.EMPTY_INPUT);
  });
});

describe('ipSubnetMeta', () => {
  it('exposes the expected registry metadata (id MUST be ip-subnet for the homepage chip)', () => {
    expect(ipSubnetMeta.id).toBe('ip-subnet');
    expect(ipSubnetMeta.slug).toBe('ip-subnet-hesaplayici');
    expect(ipSubnetMeta.categoryId).toBe('computer');
    expect(ipSubnetMeta.formula).toBeUndefined();
    expect(ipSubnetMeta.faq?.length).toBe(2);
  });
});
