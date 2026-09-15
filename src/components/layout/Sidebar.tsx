import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { forgetScrollPosition, useScrollLock } from '../../lib/scrollLock';
import { GROUP_ORDER, PRIMARY_ROUTES, ROUTES } from './Nav';

const GROUPS = GROUP_ORDER;

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
          <span className="brand-sub">Votre espace pour respirer</span>
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
      <div className="sidebar-note">
        <Icon name="sparkles" size={20} />
        <p>Moins de charge mentale.<br /><strong>Plus de vie.</strong></p>
        <span>Tout commence par un petit pas.</span>
      </div>
    </aside>
  );
}

/**
 * Barre du bas : quatre rubriques principales, puis « Plus » qui ouvre la liste
 * complète. Avant, les onze rubriques défilaient horizontalement et sept
 * restaient invisibles — personne ne devine qu'il faut faire glisser une barre.
 */
export function MobileNav({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const inSheet = !PRIMARY_ROUTES.some((r) => r.id === current);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (id: string) => {
    forgetScrollPosition(); // la rubrique suivante s'ouvre en haut
    setOpen(false);
    onNavigate(id);
  };

  return (
    <>
      <nav className="mobile-nav" aria-label="Navigation principale">
        {PRIMARY_ROUTES.map((r) => (
          <button key={r.id} aria-current={current === r.id ? 'page' : undefined} onClick={() => go(r.id)}>
            <Icon name={r.icon} size={19} />
            {r.short}
          </button>
        ))}
        <button
          aria-current={inSheet ? 'page' : undefined}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'grid'} size={19} />
          Plus
        </button>
      </nav>

      {open && (
        <div className="nav-sheet-backdrop" onClick={() => setOpen(false)}>
          <div
            className="nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Toutes les rubriques"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nav-sheet-handle" />
            {GROUPS.map((g) => (
              <section key={g}>
                <h2 className="nav-group-label">{g}</h2>
                <div className="nav-sheet-grid">
                  {ROUTES.filter((r) => r.group === g).map((r) => (
                    <button
                      key={r.id}
                      className="nav-sheet-item"
                      aria-current={current === r.id ? 'page' : undefined}
                      onClick={() => go(r.id)}
                    >
                      <Icon name={r.icon} size={20} />
                      {r.label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
