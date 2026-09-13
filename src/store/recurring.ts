import type { AppState, Recurring, Transaction } from '../types';
import { addDays, addMonths, daysInMonth, fromISO, startOfMonth, today, toISO, weekdayIndex } from '../lib/date';
import { uid } from '../lib/id';

/** Occurrences d'un modèle récurrent entre deux dates (incluses). */
export function occurrences(rec: Recurring, from: string, to: string): string[] {
  const out: string[] = [];
  if (!rec.active) return out;
  const start = rec.startDate > from ? rec.startDate : from;
  const end = rec.endDate && rec.endDate < to ? rec.endDate : to;
  if (start > end) return out;

  if (rec.frequency === 'hebdo') {
    let d = start;
    // avance jusqu'au premier jour de la semaine correspondant
    while (weekdayIndex(d) !== ((rec.anchor % 7) + 7) % 7 && d <= end) d = addDays(d, 1);
    while (d <= end) {
      out.push(d);
      d = addDays(d, 7);
    }
    return out;
  }

  const step = rec.frequency === 'mensuel' ? 1 : rec.frequency === 'trimestriel' ? 3 : 12;
  let cursor = startOfMonth(start);
  while (cursor <= end) {
    const dt = fromISO(cursor);
    const day = Math.min(Math.max(1, rec.anchor), daysInMonth(dt.getFullYear(), dt.getMonth()));
    const occ = toISO(new Date(dt.getFullYear(), dt.getMonth(), day));
    if (occ >= start && occ <= end && occ >= rec.startDate) {
      const monthsSinceStart =
        (dt.getFullYear() - fromISO(rec.startDate).getFullYear()) * 12 +
        (dt.getMonth() - fromISO(rec.startDate).getMonth());
      if (monthsSinceStart % step === 0) out.push(occ);
    }
    cursor = addMonths(cursor, 1);
  }
  return out;
}

/** Prochaine échéance d'un modèle récurrent (à partir d'aujourd'hui). */
export function nextOccurrence(rec: Recurring, from = today()): string | null {
  const list = occurrences(rec, from, addMonths(from, 13));
  return list.find((d) => d >= from) ?? null;
}

/**
 * Génère les transactions manquantes pour chaque récurrence active,
 * jusqu'à aujourd'hui. Idempotent : une occurrence déjà générée n'est jamais dupliquée.
 */
export function runRecurrings(state: AppState): AppState {
  const now = today();
  const created: Transaction[] = [];
  const existing = new Set(
    state.transactions.filter((t) => t.recurringId).map((t) => `${t.recurringId}|${t.date}`),
  );
  const recurrings = state.recurrings.map((rec) => {
    if (!rec.active) return rec;
    const from = rec.lastRun ? addDays(rec.lastRun, 1) : rec.startDate;
    if (from > now) return rec;
    for (const date of occurrences(rec, from, now)) {
      const key = `${rec.id}|${date}`;
      if (existing.has(key)) continue;
      existing.add(key);
      created.push({
        id: uid('tx'),
        date,
        label: rec.label,
        amount: rec.amount,
        kind: rec.kind,
        categoryId: rec.categoryId,
        accountId: rec.accountId,
        businessId: rec.businessId,
        recurringId: rec.id,
      });
    }
    return { ...rec, lastRun: now };
  });

  if (!created.length) return { ...state, recurrings };
  return {
    ...state,
    recurrings,
    transactions: [...state.transactions, ...created].sort((a, b) => (a.date < b.date ? 1 : -1)),
  };
}
