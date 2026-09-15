import type { IconName } from '../ui/Icon';

export interface NavRoute {
  id: string;
  label: string;
  short: string;
  icon: IconName;
  group: 'Pilotage' | 'Argent' | 'Vie';
  /** Présente directement dans la barre du bas sur mobile ; les autres vivent dans « Plus ». */
  primary?: boolean;
}

export const ROUTES: NavRoute[] = [
  { primary: true, id: 'dashboard', label: 'Tableau de bord', short: 'Accueil', icon: 'dashboard', group: 'Pilotage' },
  { primary: true, id: 'calendar', label: 'Calendrier', short: 'Agenda', icon: 'calendar', group: 'Pilotage' },
  { primary: true, id: 'tasks', label: 'Tâches', short: 'Tâches', icon: 'check', group: 'Pilotage' },
  { primary: true, id: 'finance', label: 'Finances', short: 'Argent', icon: 'wallet', group: 'Argent' },
  { id: 'business', label: 'Business', short: 'Business', icon: 'briefcase', group: 'Argent' },
  { id: 'recurring', label: 'Récurrents & budgets', short: 'Budgets', icon: 'repeat', group: 'Argent' },
  { id: 'leisure', label: 'Loisirs', short: 'Loisirs', icon: 'sparkles', group: 'Vie' },
  { id: 'habits', label: 'Habitudes', short: 'Habitudes', icon: 'flame', group: 'Vie' },
  { id: 'goals', label: 'Objectifs', short: 'Objectifs', icon: 'target', group: 'Vie' },
  { id: 'stats', label: 'Statistiques', short: 'Stats', icon: 'chart', group: 'Vie' },
  { id: 'settings', label: 'Réglages', short: 'Réglages', icon: 'settings', group: 'Vie' },
];

export const ROUTE_IDS = ROUTES.map((r) => r.id);
export const PRIMARY_ROUTES = ROUTES.filter((r) => r.primary);
export const GROUP_ORDER: Array<NavRoute['group']> = ['Pilotage', 'Argent', 'Vie'];
