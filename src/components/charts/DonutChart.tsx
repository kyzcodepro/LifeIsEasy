import { ChartFrame } from './ChartFrame';
import { useSize, useTooltip } from './util';

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/**
 * Anneau de répartition. Écart de 2px entre segments (anneau de surface),
 * chiffre héros au centre, légende + libellés directs sur les 4 premiers.
 */
export function DonutChart({
  slices,
  format,
  centerLabel,
  centerValue,
  height = 220,
}: {
  slices: Slice[];
  format: (v: number) => string;
  centerLabel: string;
  centerValue: string;
  height?: number;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const { tip, show, hide } = useTooltip<Slice & { pct: number }>();

  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = Math.min(height, width);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(30, size / 2 - 14);
  const stroke = Math.max(16, r * 0.34);
  const rInner = r - stroke / 2;
  const circ = 2 * Math.PI * rInner;

  let offset = 0;
  const segs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = total > 0 ? s.value / total : 0;
      const seg = { ...s, frac, offset, pct: frac * 100 };
      offset += frac;
      return seg;
    });

  return (
    <ChartFrame
      legend={segs.map((s) => ({ label: s.label, color: s.color }))}
      table={{
        head: ['Catégorie', 'Montant', 'Part'],
        rows: segs.map((s) => [s.label, format(s.value), `${s.pct.toFixed(1)} %`]),
      }}
    >
      <div className="chart chart-wrap" ref={ref}>
        <svg height={height} width={width} role="img">
          <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          {segs.map((s) => (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={rInner}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, s.frac * circ - 2)} ${circ - Math.max(0, s.frac * circ - 2)}`}
              strokeDashoffset={-s.offset * circ}
              transform={`rotate(-90 ${cx} ${cy})`}
              onMouseMove={(e) => {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                show(e.clientX - box.left, e.clientY - box.top - 10, s);
              }}
              onMouseLeave={hide}
              style={{ cursor: 'pointer' }}
            />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={22} fontWeight={680} fill="var(--ink)">
            {centerValue}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="var(--ink-muted)">
            {centerLabel}
          </text>
        </svg>

        {tip && (
          <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
            <div className="t-title">{tip.data.label}</div>
            <div className="t-row">
              <span className="t-key">
                <span className="swatch" style={{ background: tip.data.color }} />
                Montant
              </span>
              <span className="t-val">{format(tip.data.value)}</span>
            </div>
            <div className="t-row">
              <span className="t-key">Part</span>
              <span className="t-val">{tip.data.pct.toFixed(1)} %</span>
            </div>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
