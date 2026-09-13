import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div style={{ minWidth: 0 }}>
            {title && <h2>{title}</h2>}
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {actions && <div className="actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  foot,
  delta,
  tone = 'flat',
  small,
}: {
  label: string;
  value: string;
  foot?: ReactNode;
  delta?: string;
  tone?: 'up' | 'down' | 'flat';
  small?: boolean;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${small ? ' sm' : ''} tnum`}>{value}</span>
      <span className="stat-foot">
        {delta && (
          <span className={`delta ${tone}`}>
            {tone !== 'flat' && <Icon name={tone === 'up' ? 'arrowUp' : 'arrowDown'} size={12} />}
            {delta}
          </span>
        )}
        {foot}
      </span>
    </div>
  );
}

export function EmptyState({ icon = 'sparkles', text, action }: { icon?: IconName; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={22} />
      <span>{text}</span>
      {action}
    </div>
  );
}

export function ProgressBar({ pct, color, height = 8 }: { pct: number; color?: string; height?: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="progress" style={{ height }} role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}
