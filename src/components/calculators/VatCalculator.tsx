import { useState } from 'react';
import {
  convertVat,
  KDV_RATES,
  type VatDirection,
} from '../../calculators/general/kdv';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';
import { formatNumber, parseField } from './parse';

const RATE_OPTIONS = KDV_RATES.map((r) => ({ value: r.id, label: r.label }));
const DIRECTION_OPTIONS = [
  { value: 'add', label: 'KDV Ekle (hariç → dahil)' },
  { value: 'extract', label: 'KDV Ayır (dahil → hariç)' },
];

/**
 * VAT (KDV) calculator island. Live compute; "Temizle" resets. Adds VAT to a net
 * amount or extracts it from a gross amount via the pure `convertVat` engine.
 */
export default function VatCalculator() {
  const [amount, setAmount] = useState('100');
  const [rateId, setRateId] = useState('20');
  const [direction, setDirection] = useState<VatDirection>('add');

  const rate = KDV_RATES.find((r) => r.id === rateId)?.rate ?? 20;
  const parsed = parseField(amount);
  const result = parsed === undefined ? null : convertVat({ amount: parsed, rate, direction });
  const isBlank = amount.trim() === '';

  function handleClear(): void {
    setAmount('');
    setRateId('20');
    setDirection('add');
  }

  const amountLabel = direction === 'add' ? 'Tutar (KDV hariç)' : 'Tutar (KDV dahil)';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Tutar ve Oran</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            “KDV Ekle” ile KDV hariç tutara vergiyi ekleyin; “KDV Ayır” ile KDV
            dahil tutardan vergiyi çıkarın. Sonuç anında güncellenir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label={amountLabel} unit="₺" value={amount} onChange={setAmount} />
            <UnitSelect label="KDV Oranı" value={rateId} options={RATE_OPTIONS} onChange={setRateId} />
            <div className="sm:col-span-2">
              <UnitSelect
                label="İşlem"
                value={direction}
                options={DIRECTION_OPTIONS}
                onChange={(v) => setDirection(v as VatDirection)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </div>

      {isBlank && (
        <p className="error-note" role="alert">
          Bir tutar girin.
        </p>
      )}
      {!isBlank && result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}
      {!isBlank && result && result.ok && (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <SectionLabel>Sonuç</SectionLabel>
          <ConversionResult
            rows={[
              { label: 'KDV Hariç (Net)', value: formatNumber(result.net) },
              { label: `KDV Tutarı (%${rate})`, value: formatNumber(result.kdv) },
              { label: 'KDV Dahil (Brüt)', value: formatNumber(result.gross) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
