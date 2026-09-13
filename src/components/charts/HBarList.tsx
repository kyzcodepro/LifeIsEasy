export interface HBarItem {
  label: string;
  value: number;
  color: string;
  sub?: string;
}

/**
 * Classement en barres horizontales avec libellés directs — la forme la plus
 * lisible pour comparer des catégories nommées (et son propre « relief ».)
 */
export function HBarList({ items, format }: { items: HBarItem[]; format: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="empty">Aucune donnée sur la période.</div>;
  return (
    <div className="stack" style={{ gap: 12 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex" style={{ marginBottom: 4 }}>
            <span className="small" style={{ fontWeight: 550 }}>
              {it.label}
            </span>
            <div className="spacer" />
            <span className="small tnum" style={{ fontWeight: 620 }}>
              {format(it.value)}
            </span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <span style={{ width: `${(it.value / max) * 100}%`, background: it.color }} />
          </div>
          {it.sub && (
            <div className="small muted" style={{ marginTop: 3 }}>
              {it.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
