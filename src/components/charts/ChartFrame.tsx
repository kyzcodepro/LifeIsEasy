import { useState } from 'react';
import type { ReactNode } from 'react';

export interface LegendItem {
  label: string;
  color: string;
}

/**
 * Cadre commun aux graphiques : légende (obligatoire dès 2 séries),
 * bascule « vue tableau » (relief d'accessibilité) et zone de tooltip.
 */
export function ChartFrame({
  legend,
  table,
  children,
  note,
}: {
  legend?: LegendItem[];
  table?: { head: string[]; rows: Array<Array<string | number>> };
  children: ReactNode;
  note?: string;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      {showTable && table ? (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                {table.head.map((h, i) => (
                  <th key={h} className={i === 0 ? undefined : 'num'}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={j === 0 ? undefined : 'num'}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}

      <div className="flex flex-wrap" style={{ marginTop: 10, gap: 12 }}>
        {legend && legend.length > 1 && (
          <div className="chart-legend" style={{ margin: 0 }}>
            {legend.map((l) => (
              <span className="item" key={l.label}>
                <span className="swatch" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}
        <div className="spacer" />
        {note && <span className="small muted">{note}</span>}
        {table && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Voir le graphique' : 'Voir les données'}
          </button>
        )}
      </div>
    </div>
  );
}
