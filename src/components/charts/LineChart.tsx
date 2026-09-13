import { ChartFrame } from './ChartFrame';
import { niceTicks, useSize, useTooltip } from './util';

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
  area?: boolean;
}

/** Courbe(s) avec réticule et infobulle. Traits 2px, marqueurs 8px au survol. */
export function LineChart({
  labels,
  series,
  height = 200,
  format,
  zeroLine,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  format: (v: number) => string;
  zeroLine?: boolean;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const { tip, show, hide } = useTooltip<{ i: number }>();

  const padL = 54;
  const padR = 10;
  const padT = 12;
  const padB = 26;
  const innerW = Math.max(40, width - padL - padR);
  const innerH = height - padT - padB;

  const all = series.flatMap((s) => s.values);
  const rawMax = Math.max(1, ...all);
  const rawMin = Math.min(0, ...all);
  const ticks = niceTicks(rawMax);
  const top = ticks[ticks.length - 1] || 1;
  const bottom = rawMin < 0 ? -niceTicks(Math.abs(rawMin), 2)[niceTicks(Math.abs(rawMin), 2).length - 1] : 0;

  const x = (i: number) => padL + (labels.length <= 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - bottom) / (top - bottom || 1)) * innerH;

  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <ChartFrame
      legend={series.map((s) => ({ label: s.name, color: s.color }))}
      table={{
        head: ['Période', ...series.map((s) => s.name)],
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
          {(zeroLine || bottom < 0) && (
            <line x1={padL} x2={width - padR} y1={y(0)} y2={y(0)} stroke="var(--axis)" strokeWidth={1} />
          )}

          {series.map((s) =>
            s.area ? (
              <path
                key={`a-${s.name}`}
                d={`${path(s.values)} L${x(s.values.length - 1)},${y(Math.max(0, bottom))} L${x(0)},${y(Math.max(0, bottom))} Z`}
                fill={s.color}
                opacity={0.1}
              />
            ) : null,
          )}
          {series.map((s) => (
            <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {tip && (
            <g pointerEvents="none">
              <line x1={x(tip.data.i)} x2={x(tip.data.i)} y1={padT} y2={padT + innerH} stroke="var(--axis)" strokeWidth={1} />
              {series.map((s) => (
                <circle
                  key={s.name}
                  cx={x(tip.data.i)}
                  cy={y(s.values[tip.data.i] ?? 0)}
                  r={4.5}
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {labels.map((l, i) => (
            <g key={l}>
              <rect
                x={x(i) - innerW / Math.max(1, labels.length) / 2}
                y={padT}
                width={innerW / Math.max(1, labels.length)}
                height={innerH}
                fill="transparent"
                onMouseMove={() => show(x(i), padT + 4, { i })}
                onMouseLeave={hide}
              />
              <text x={x(i)} y={height - 8} textAnchor="middle" fontSize={10.5} fill="var(--ink-muted)">
                {l}
              </text>
            </g>
          ))}
        </svg>

        {tip && (
          <div className="tooltip" style={{ left: x(tip.data.i), top: padT }}>
            <div className="t-title">{labels[tip.data.i]}</div>
            {series.map((s) => (
              <div className="t-row" key={s.name}>
                <span className="t-key">
                  <span className="swatch" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="t-val">{format(s.values[tip.data.i] ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
