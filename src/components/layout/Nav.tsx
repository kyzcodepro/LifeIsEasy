import type { IconName } from '../ui/Icon';

export interface NavRoute {
  id: string;
  label: string;
  short: string;
  icon: IconName;
  group: 'Pilotage' | 'Argent' | 'Vie';
}

export const ROUTES: NavRoute[] = [
  { id: 'dashboard', label: 'Tableau de bord', short: 'Accueil', icon: 'dashboard', group: 'Pilotage' },
  { id: 'calendar', label: 'Calendrier', short: 'Agenda', icon: 'calendar', group: 'Pilotage' },
  { id: 'tasks', label: 'Tâches', short: 'Tâches', icon: 'check', group: 'Pilotage' },
  { id: 'finance', label: 'Finances', short: 'Argent', icon: 'wallet', group: 'Argent' },
  { id: 'business', label: 'Business', short: 'Business', icon: 'briefcase', group: 'Argent' },
  { id: 'recurring', label: 'Récurrents & budgets', short: 'Budgets', icon: 'repeat', group: 'Argent' },
  { id: 'leisure', label: 'Loisirs', short: 'Loisirs', icon: 'sparkles', group: 'Vie' },
  { id: 'habits', label: 'Habitudes', short: 'Habitudes', icon: 'flame', group: 'Vie' },
  { id: 'goals', label: 'Objectifs', short: 'Objectifs', icon: 'target', group: 'Vie' },
  { id: 'stats', label: 'Statistiques', short: 'Stats', icon: 'chart', group: 'Vie' },
  { id: 'settings', label: 'Réglages', short: 'Réglages', icon: 'settings', group: 'Vie' },
];

export const ROUTE_IDS = ROUTES.map((r) => r.id);
