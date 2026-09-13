import { useState } from 'react';
import { addDays, DAY_SHORT, formatDate, MONTH_SHORT, fromISO, startOfWeek } from '../../lib/date';

/**
 * Calendrier-densité (12 semaines) : rampe séquentielle bleue à une seule
 * teinte, du clair (rien) au foncé (tout fait). Infobulle par cellule.
 */
export function Heatmap({
  endDate,
  weeks = 12,
  valueFor,
  labelFor,
}: {
  endDate: string;
  weeks?: number;
  /** 0 → 1 */
  valueFor: (iso: string) => number;
  labelFor: (iso: string) => string;
}) {
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null);
  const cell = 13;
  const gap = 3;
  const lastMonday = startOfWeek(endDate);
  const start = addDays(lastMonday, -(weeks - 1) * 7);

  const width = weeks * (cell + gap) + 28;
  const height = 7 * (cell + gap) + 18;

  const ramp = ['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-4)', 'var(--seq-6)'];
  const colorFor = (v: number) => (v <= 0 ? ramp[0] : v < 0.34 ? ramp[1] : v < 0.67 ? ramp[2] : v < 1 ? ramp[3] : ramp[4]);

  const monthLabels: Array<{ x: number; text: string }> = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const d = fromISO(addDays(start, w * 7));
    if (d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      monthLabels.push({ x: 28 + w * (cell + gap), text: MONTH_SHORT[lastMonth] });
    }
  }

  return (
    <div className="chart chart-wrap">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width }} role="img" aria-label="Régularité des 12 dernières semaines">
        {monthLabels.map((m) => (
          <text key={`${m.text}-${m.x}`} x={m.x} y={8} fontSize={9} fill="var(--ink-muted)">
            {m.text}
          </text>
        ))}
        {[0, 2, 4, 6].map((d) => (
          <text key={d} x={0} y={18 + d * (cell + gap) + cell - 3} fontSize={9} fill="var(--ink-muted)">
            {DAY_SHORT[d]}
          </text>
        ))}
        {Array.from({ length: weeks }).map((_, w) =>
          Array.from({ length: 7 }).map((__, d) => {
            const iso = addDays(start, w * 7 + d);
            if (iso > endDate) return null;
            const v = valueFor(iso);
            return (
              <rect
                key={iso}
                className="heat-cell"
                x={28 + w * (cell + gap)}
                y={14 + d * (cell + gap)}
                width={cell}
                height={cell}
                fill={colorFor(v)}
                stroke="var(--surface)"
                strokeWidth={1}
                onMouseEnter={() => setHover({ iso, x: 28 + w * (cell + gap) + cell / 2, y: 14 + d * (cell + gap) })}
                onMouseLeave={() => setHover(null)}
              />
            );
          }),
        )}
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: `${(hover.x / width) * 100}%`, top: hover.y }}>
          <div className="t-title">{formatDate(hover.iso, { weekday: true })}</div>
          <div className="t-row">
            <span className="t-key">{labelFor(hover.iso)}</span>
          </div>
        </div>
      )}
      <div className="chart-legend" style={{ alignItems: 'center' }}>
        <span className="item">Moins</span>
        {ramp.map((c) => (
          <span key={c} className="swatch" style={{ background: c }} />
        ))}
        <span className="item">Plus</span>
      </div>
    </div>
  );
}
