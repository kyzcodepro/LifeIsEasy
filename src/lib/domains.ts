import type { Domain, Priority } from '../types';

export const DOMAIN_META: Record<Domain, { label: string; slot: number }> = {
  travail: { label: 'Travail', slot: 1 },
  business: { label: 'Business', slot: 4 },
  finances: { label: 'Finances', slot: 3 },
  loisir: { label: 'Loisir', slot: 5 },
  sante: { label: 'Santé', slot: 6 },
  perso: { label: 'Perso', slot: 7 },
  famille: { label: 'Famille', slot: 2 },
};

export function domainColor(d: Domain): string {
  return `var(--s${DOMAIN_META[d].slot})`;
}

export const DOMAIN_OPTIONS = (Object.keys(DOMAIN_META) as Domain[]).map((d) => ({
  value: d,
  label: DOMAIN_META[d].label,
}));

export const PRIORITY_META: Record<Priority, { label: string; color: string; rank: number }> = {
  haute: { label: 'Haute', color: 'var(--critical)', rank: 0 },
  normale: { label: 'Normale', color: 'var(--warning)', rank: 1 },
  basse: { label: 'Basse', color: 'var(--ink-muted)', rank: 2 },
};

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_META) as Priority[]).map((p) => ({
  value: p,
  label: PRIORITY_META[p].label,
}));

export const BUSINESS_STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' | '' }> = {
  idee: { label: 'Idée', tone: '' },
  lancement: { label: 'Lancement', tone: 'warn' },
  actif: { label: 'Actif', tone: 'good' },
  pause: { label: 'En pause', tone: '' },
  arrete: { label: 'Arrêté', tone: 'bad' },
};
