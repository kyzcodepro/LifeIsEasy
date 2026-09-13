import { Icon } from '../ui/Icon';
import { ROUTES } from './Nav';
import type { NavRoute } from './Nav';

const GROUPS: Array<NavRoute['group']> = ['Pilotage', 'Argent', 'Vie'];

export function Sidebar({
  current,
  onNavigate,
  badges,
}: {
  current: string;
  onNavigate: (id: string) => void;
  badges: Record<string, number | undefined>;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="sparkles" size={18} />
        </span>
        <span>
          <span className="brand-name">Life Is Easy</span>
          <span className="brand-sub">Pilotez toute votre vie</span>
        </span>
      </div>

      {GROUPS.map((g) => (
        <div key={g}>
          <div className="nav-group-label">{g}</div>
          {ROUTES.filter((r) => r.group === g).map((r) => (
            <button
              key={r.id}
              className="nav-item"
              aria-current={current === r.id ? 'page' : undefined}
              onClick={() => onNavigate(r.id)}
            >
              <Icon name={r.icon} size={16} />
              {r.label}
              {badges[r.id] ? <span className="count tnum">{badges[r.id]}</span> : null}
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

export function MobileNav({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  return (
    <nav className="mobile-nav">
      {ROUTES.map((r) => (
        <button key={r.id} aria-current={current === r.id ? 'page' : undefined} onClick={() => onNavigate(r.id)}>
          <Icon name={r.icon} size={17} />
          {r.short}
        </button>
      ))}
    </nav>
  );
}
