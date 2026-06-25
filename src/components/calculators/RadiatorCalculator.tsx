import { useState } from 'react';
import {
  solveRadiator,
  PANEL_TYPES,
  type RadiatorResult,
  type PanelTypeId,
} from '../../calculators/hvac/radyator-dilim';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const PANEL_OPTIONS = PANEL_TYPES.map((panel) => ({
  value: panel.id,
  label: panel.label,
}));

/**
 * Radiator panel section-count island. A heating load (W) — which the user can
 * take from the Isı Kaybı tool — plus a panel type feed the pure `solveRadiator`
 * engine, which rounds the section count UP. Per-section outputs are approximate
 * (90/70 °C), so a disclaimer is always shown.
 */
export default function RadiatorCalculator() {
  const [load, setLoad] = useState('2000');
  const [panelType, setPanelType] = useState<PanelTypeId>('pkkp');

  const isBlank = load.trim() === '';

  let result: RadiatorResult | null = null;
  if (!isBlank) {
    result = solveRadiator({
      loadW: parseField(load) ?? NaN,
      panelType,
    });
  }

  function handleClear(): void {
    setLoad('');
    setPanelType('pkkp');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Gereken Dilim Sayısı', value: String(result.sections), unit: 'dilim' },
          { label: 'Tam Değer', value: formatNumber(result.sectionsExact), unit: 'dilim' },
          { label: 'Dilim Başına Güç', value: String(result.wPerSection), unit: 'W/dilim' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Isıtma Yükü ve Petek Tipi</SectionLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Isıtma Yükü" unit="W" value={load} onChange={setLoad} />
            <UnitSelect
              label="Petek Tipi"
              value={panelType}
              options={PANEL_OPTIONS}
              onChange={(v) => setPanelType(v as PanelTypeId)}
            />
          </div>
          <p className="mt-2 text-[12px] text-text-dim">
            Isıtma yükünü Isı Kaybı hesaplama aracından (W) alabilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </div>

      <div className="rounded-[11px] border border-border-strong bg-surface-sunken px-4 py-3 text-[12.5px] leading-relaxed text-text-muted">
        Dilim başına güç değerleri 90/70 °C rejimi için <span className="text-text">yaklaşıktır</span>;
        gerçek değerler üreticinin kataloğuna, panel yüksekliğine ve gidiş/dönüş sıcaklığına göre değişir.
      </div>

      {isBlank && (
        <p className="error-note" role="alert">
          Isıtma yükünü (W) girin.
        </p>
      )}
      {!isBlank && result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}
      {!isBlank && result && result.ok && (
        <div className="flex flex-col gap-5" role="status" aria-live="polite">
          <ResultCard
            values={heroValues}
            caption={
              result.note ??
              `${result.panelLabel} için dilim başına ${result.wPerSection} W (90/70 °C, yaklaşık) alınmıştır.`
            }
          />
          <div>
            <SectionLabel>Adım Adım Çözüm</SectionLabel>
            <div className="mt-3">
              <StepList steps={result.steps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
