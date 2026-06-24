import { useState } from 'react';
import { calculateSubnet } from '../../calculators/computer/ip-subnet';
import SectionLabel from '../ui/SectionLabel';
import TextInput from '../ui/TextInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';

const PREFIX_OPTIONS = Array.from({ length: 33 }, (_, i) => ({
  value: String(i),
  label: `/${i}`,
}));

/**
 * IP / Subnet (CIDR) calculator island. Computes LIVE as the IP or prefix
 * changes (no "Hesapla" button); "Temizle" resets. All CIDR math is delegated
 * to the pure `calculateSubnet` engine; results render as copyable rows.
 */
export default function SubnetCalculator() {
  const [ip, setIp] = useState('192.168.1.10');
  const [prefix, setPrefix] = useState('24');

  const result = calculateSubnet({ ip, prefix: Number(prefix) });
  const isBlank = ip.trim() === '';

  function handleClear(): void {
    setIp('');
    setPrefix('24');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>IP ve CIDR Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            IPv4 adresini yazın ve CIDR önekini seçin; ağ, broadcast, host aralığı
            ve maske anında hesaplanır. Girilen adresin ağ adresi olması gerekmez.
            (Yalnızca IPv4 desteklenir.)
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="IPv4 Adresi"
              value={ip}
              onChange={setIp}
              mono
              placeholder="örn. 192.168.1.10"
              invalid={!isBlank && !result.ok}
            />
            <UnitSelect
              label="CIDR Öneki"
              value={prefix}
              options={PREFIX_OPTIONS}
              onChange={setPrefix}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </div>

      {!result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}

      {result.ok && (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <SectionLabel>Sonuç</SectionLabel>
          <ConversionResult
            rows={result.rows.map((r) => ({ label: r.label, value: r.value }))}
            caption={result.notes.length > 0 ? result.notes.join(' ') : undefined}
          />
        </div>
      )}
    </div>
  );
}
