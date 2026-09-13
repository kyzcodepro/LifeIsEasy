/** Utilitaires de date, sans dépendance externe. Les dates circulent en `YYYY-MM-DD`. */

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
export const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return toISO(d);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Indice de jour avec lundi = 0. */
export function weekdayIndex(iso: string): number {
  return (fromISO(iso).getDay() + 6) % 7;
}

/** Lundi de la semaine contenant `iso`. */
export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01';
}

export function endOfMonth(iso: string): string {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Clé mois `YYYY-MM`. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split('-').map(Number);
  const names = short ? MONTH_SHORT : MONTH_NAMES;
  return `${names[(m ?? 1) - 1]} ${short ? String(y).slice(2) : y}`;
}

/** Les N derniers mois (clés `YYYY-MM`), du plus ancien au plus récent, incluant le mois de `iso`. */
export function lastMonths(iso: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(addMonths(startOfMonth(iso), -i)));
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
}

export function isSameMonth(a: string, b: string): boolean {
  return monthKey(a) === monthKey(b);
}

export function formatDate(iso: string, opts: { withYear?: boolean; weekday?: boolean } = {}): string {
  const d = fromISO(iso);
  const parts: string[] = [];
  if (opts.weekday) parts.push(DAY_SHORT[weekdayIndex(iso)]);
  parts.push(String(d.getDate()));
  parts.push(MONTH_SHORT[d.getMonth()]);
  if (opts.withYear) parts.push(String(d.getFullYear()));
  return parts.join(' ');
}

export function relativeDay(iso: string): string {
  const diff = daysBetween(today(), iso);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  if (diff > 1 && diff < 7) return `Dans ${diff} j`;
  if (diff < -1 && diff > -7) return `Il y a ${-diff} j`;
  return formatDate(iso, { withYear: Math.abs(diff) > 300 });
}

/** Minutes entre deux heures `HH:MM`. */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export function isoWeekDays(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i));
}
