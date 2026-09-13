import { ChartFrame } from './ChartFrame';
import { niceTicks, useSize, useTooltip } from './util';

export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}

/**
 * Barres groupées (1 à 3 séries). Extrémités arrondies 4px ancrées à la
 * ligne de base, écart de 2px entre barres adjacentes, grille discrète.
 */
export function BarChart({
  labels,
  series,
  height = 200,
  format,
  tableHead,
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
  format: (v: number) => string;
  tableHead?: string;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const { tip, show, hide } = useTooltip<{ label: string; rows: Array<{ name: string; color: string; value: number }> }>();

  const padL = 52;
  const padR = 8;
  const padT = 10;
  const padB = 26;
  const innerW = Math.max(40, width - padL - padR);
  const innerH = height - padT - padB;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const groupW = innerW / Math.max(1, labels.length);
  const gap = 2;
  const barW = Math.max(4, (groupW * 0.62 - gap * (series.length - 1)) / series.length);

  const y = (v: number) => padT + innerH - (v / top) * innerH;

  return (
    <ChartFrame
      legend={series.map((s) => ({ label: s.name, color: s.color }))}
      table={{
        head: [tableHead ?? 'Période', ...series.map((s) => s.name)],
        rows: labels.map((l, i) => [l, ...series.map((s) => format(s.values[i] ?? 0))]),
      }}
    >
      <div className="chart chart-wrap" ref={ref}>
        <svg height={height} width={width} role="img">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill="var(--ink-muted)" className="tnum">
                {format(t)}
              </text>
            </g>
          ))}
          <line x1={padL} x2={width - padR} y1={y(0)} y2={y(0)} stroke="var(--axis)" strokeWidth={1} />

          {labels.map((label, gi) => {
            const gx = padL + gi * groupW;
            const groupInner = series.length * barW + gap * (series.length - 1);
            const startX = gx + (groupW - groupInner) / 2;
            return (
              <g key={label}>
                <rect
                  x={gx}
                  y={padT}
                  width={groupW}
                  height={innerH}
                  fill="transparent"
                  onMouseMove={(e) => {
                    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    show(e.clientX - box.left, padT + 8, {
                      label,
                      rows: series.map((s) => ({ name: s.name, color: s.color, value: s.values[gi] ?? 0 })),
                    });
                  }}
                  onMouseLeave={hide}
                />
                {series.map((s, si) => {
                  const v = s.values[gi] ?? 0;
                  const h = Math.max(v > 0 ? 2 : 0, (v / top) * innerH);
                  return (
                    <rect
                      key={s.name}
                      x={startX + si * (barW + gap)}
                      y={y(0) - h}
                      width={barW}
                      height={h}
                      rx={Math.min(4, barW / 2)}
                      fill={s.color}
                      pointerEvents="none"
                    />
                  );
                })}
                <text x={gx + groupW / 2} y={height - 8} textAnchor="middle" fontSize={10.5} fill="var(--ink-muted)">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {tip && (
          <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
            <div className="t-title">{tip.data.label}</div>
            {tip.data.rows.map((r) => (
              <div className="t-row" key={r.name}>
                <span className="t-key">
                  <span className="swatch" style={{ background: r.color }} />
                  {r.name}
                </span>
                <span className="t-val">{format(r.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
