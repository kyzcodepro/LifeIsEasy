import type {
  AppState, CalendarEvent, Domain, Goal, Habit, ID, Transaction,
} from '../types';
import {
  addDays, daysBetween, endOfMonth, fromISO, lastMonths, minutesBetween,
  monthKey, startOfMonth, startOfWeek, today, weekdayIndex,
} from '../lib/date';

/* ------------------------------------------------------------------ Comptes */

export function accountBalance(state: AppState, accountId: ID): number {
  const acc = state.accounts.find((a) => a.id === accountId);
  if (!acc) return 0;
  return state.transactions.reduce(
    (sum, t) => (t.accountId !== accountId ? sum : t.kind === 'revenu' ? sum + t.amount : sum - t.amount),
    acc.initialBalance,
  );
}

export function netWorth(state: AppState): number {
  return state.accounts.reduce((sum, a) => sum + accountBalance(state, a.id), 0);
}

/* ------------------------------------------------------------- Transactions */

export function txInMonth(state: AppState, mKey: string): Transaction[] {
  return state.transactions.filter((t) => monthKey(t.date) === mKey);
}

export function txBetween(state: AppState, from: string, to: string): Transaction[] {
  return state.transactions.filter((t) => t.date >= from && t.date <= to);
}

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
  savingRate: number;
}

export function monthTotals(state: AppState, mKey: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txInMonth(state, mKey)) {
    if (t.kind === 'revenu') income += t.amount;
    else expense += t.amount;
  }
  const net = income - expense;
  return { income, expense, net, savingRate: income > 0 ? (net / income) * 100 : 0 };
}

/**
 * Totaux d'un mois limités aux `day` premiers jours — pour comparer le mois en
 * cours (incomplet) au précédent « à période comparable ».
 */
export function monthTotalsUpTo(state: AppState, mKey: string, day: number): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txInMonth(state, mKey)) {
    if (Number(t.date.slice(8, 10)) > day) continue;
    if (t.kind === 'revenu') income += t.amount;
    else expense += t.amount;
  }
  const net = income - expense;
  return { income, expense, net, savingRate: income > 0 ? (net / income) * 100 : 0 };
}

export function expensesByCategory(state: AppState, mKey: string): Array<{ id: ID; name: string; slot: number; value: number }> {
  const map = new Map<ID, number>();
  for (const t of txInMonth(state, mKey)) {
    if (t.kind !== 'depense') continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([id, value]) => {
      const cat = state.categories.find((c) => c.id === id);
      return { id, name: cat?.name ?? 'Autre', slot: cat?.slot ?? 8, value };
    })
    .sort((a, b) => b.value - a.value);
}

export function incomeBySource(state: AppState, mKey: string): Array<{ id: ID; name: string; slot: number; value: number }> {
  const map = new Map<ID, number>();
  for (const t of txInMonth(state, mKey)) {
    if (t.kind !== 'revenu') continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([id, value]) => {
      const cat = state.categories.find((c) => c.id === id);
      return { id, name: cat?.name ?? 'Autre', slot: cat?.slot ?? 8, value };
    })
    .sort((a, b) => b.value - a.value);
}

export interface CashflowPoint {
  key: string;
  income: number;
  expense: number;
  net: number;
}

export function cashflow(state: AppState, months = 6, ref = today()): CashflowPoint[] {
  return lastMonths(ref, months).map((key) => {
    const t = monthTotals(state, key);
    return { key, income: t.income, expense: t.expense, net: t.net };
  });
}

export interface BudgetLine {
  id: ID;
  name: string;
  slot: number;
  budget: number;
  spent: number;
  pct: number;
  remaining: number;
}

export function budgetLines(state: AppState, mKey: string): BudgetLine[] {
  const spentBy = new Map<ID, number>();
  for (const t of txInMonth(state, mKey)) {
    if (t.kind !== 'depense') continue;
    spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount);
  }
  return state.categories
    .filter((c) => c.kind === 'depense' && c.budget > 0)
    .map((c) => {
      const spent = spentBy.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        slot: c.slot,
        budget: c.budget,
        spent,
        pct: c.budget > 0 ? (spent / c.budget) * 100 : 0,
        remaining: c.budget - spent,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

/* ----------------------------------------------------------------- Business */

export interface BusinessStats {
  revenue: number;
  charges: number;
  margin: number;
  goal: number;
  goalPct: number;
}

export function businessStats(state: AppState, businessId: ID, mKey: string): BusinessStats {
  let revenue = 0;
  let charges = 0;
  for (const t of txInMonth(state, mKey)) {
    if (t.businessId !== businessId) continue;
    if (t.kind === 'revenu') revenue += t.amount;
    else charges += t.amount;
  }
  const biz = state.businesses.find((b) => b.id === businessId);
  const goal = biz?.monthlyGoal ?? 0;
  return { revenue, charges, margin: revenue - charges, goal, goalPct: goal > 0 ? (revenue / goal) * 100 : 0 };
}

export function businessMonthlySeries(state: AppState, businessId: ID, months = 6, ref = today()) {
  return lastMonths(ref, months).map((key) => ({ key, ...businessStats(state, businessId, key) }));
}

export function allBusinessRevenue(state: AppState, mKey: string): number {
  return txInMonth(state, mKey)
    .filter((t) => t.businessId && t.kind === 'revenu')
    .reduce((s, t) => s + t.amount, 0);
}

/* ---------------------------------------------------------------- Calendrier */

/** L'événement `ev` a-t-il une occurrence le jour `iso` ? */
export function eventOccursOn(ev: CalendarEvent, iso: string): boolean {
  if (ev.date === iso) return true;
  if (ev.repeat === 'aucune' || iso < ev.date) return false;
  if (ev.repeat === 'quotidien') return true;
  if (ev.repeat === 'hebdo') return weekdayIndex(ev.date) === weekdayIndex(iso);
  if (ev.repeat === 'mensuel') return fromISO(ev.date).getDate() === fromISO(iso).getDate();
  return false;
}

export function eventsOn(state: AppState, iso: string): CalendarEvent[] {
  return state.events
    .filter((e) => eventOccursOn(e, iso))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function eventsBetween(state: AppState, from: string, to: string): Array<{ date: string; event: CalendarEvent }> {
  const out: Array<{ date: string; event: CalendarEvent }> = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const ev of eventsOn(state, d)) out.push({ date: d, event: ev });
  }
  return out;
}

export function upcomingEvents(state: AppState, days = 7, ref = today()) {
  return eventsBetween(state, ref, addDays(ref, days)).slice(0, 40);
}

/** Minutes planifiées par domaine sur une période. */
export function plannedMinutesByDomain(state: AppState, from: string, to: string): Record<Domain, number> {
  const out = {} as Record<Domain, number>;
  for (const { event } of eventsBetween(state, from, to)) {
    const mins = minutesBetween(event.start, event.end);
    out[event.domain] = (out[event.domain] ?? 0) + mins;
  }
  return out;
}

/* -------------------------------------------------------------------- Tâches */

export function tasksDue(state: AppState, iso: string) {
  return state.tasks.filter((t) => !t.done && t.due && t.due <= iso).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));
}

export function taskStats(state: AppState) {
  const open = state.tasks.filter((t) => !t.done);
  const now = today();
  const late = open.filter((t) => t.due && t.due < now);
  const doneThisWeek = state.tasks.filter((t) => t.done && t.doneAt && t.doneAt >= startOfWeek(now));
  const doneTotal = state.tasks.filter((t) => t.done).length;
  return {
    open: open.length,
    late: late.length,
    todayCount: open.filter((t) => t.due === now).length,
    doneThisWeek: doneThisWeek.length,
    completion: state.tasks.length ? (doneTotal / state.tasks.length) * 100 : 0,
  };
}

/* ---------------------------------------------------------------- Habitudes */

export function habitDone(state: AppState, habitId: ID, iso: string): boolean {
  return !!state.habitLogs[`${habitId}|${iso}`];
}

export interface HabitStats {
  streak: number;
  best: number;
  last30: number;
  weekCount: number;
  weekPct: number;
  monthPct: number;
}

export function habitStats(state: AppState, habit: Habit, ref = today()): HabitStats {
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = addDays(ref, -i);
    if (habitDone(state, habit.id, d)) streak++;
    else if (i > 0 || !habitDone(state, habit.id, ref)) break;
    if (i > 400) break;
  }
  let best = 0;
  let run = 0;
  for (let i = 365; i >= 0; i--) {
    const d = addDays(ref, -i);
    if (habitDone(state, habit.id, d)) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  let last30 = 0;
  for (let i = 0; i < 30; i++) if (habitDone(state, habit.id, addDays(ref, -i))) last30++;
  const weekStart = startOfWeek(ref);
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (d <= ref && habitDone(state, habit.id, d)) weekCount++;
  }
  return {
    streak,
    best,
    last30,
    weekCount,
    weekPct: habit.weeklyTarget > 0 ? (weekCount / habit.weeklyTarget) * 100 : 0,
    monthPct: (last30 / 30) * 100,
  };
}

/** Taux de complétion global des habitudes sur les N derniers jours. */
export function habitsCompletion(state: AppState, days = 7, ref = today()): number {
  const habits = state.habits.filter((h) => !h.archived);
  if (!habits.length) return 0;
  let done = 0;
  let target = 0;
  for (const h of habits) {
    const perDay = h.weeklyTarget / 7;
    for (let i = 0; i < days; i++) {
      const d = addDays(ref, -i);
      target += perDay;
      if (habitDone(state, h.id, d)) done++;
    }
  }
  return target > 0 ? Math.min(100, (done / target) * 100) : 0;
}

/* ------------------------------------------------------------------ Loisirs */

export function leisureMonth(state: AppState, mKey: string) {
  const sessions = state.sessions.filter((s) => monthKey(s.date) === mKey);
  const minutes = sessions.reduce((s, x) => s + x.minutes, 0);
  const cost = sessions.reduce((s, x) => s + x.cost, 0);
  const rating = sessions.length ? sessions.reduce((s, x) => s + x.rating, 0) / sessions.length : 0;
  return { sessions, minutes, cost, rating, count: sessions.length };
}

export function leisureByActivity(state: AppState, mKey: string) {
  const map = new Map<ID, { minutes: number; cost: number; count: number }>();
  for (const s of state.sessions) {
    if (monthKey(s.date) !== mKey) continue;
    const cur = map.get(s.activityId) ?? { minutes: 0, cost: 0, count: 0 };
    cur.minutes += s.minutes;
    cur.cost += s.cost;
    cur.count += 1;
    map.set(s.activityId, cur);
  }
  return state.activities
    .map((a) => ({ activity: a, ...(map.get(a.id) ?? { minutes: 0, cost: 0, count: 0 }) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/* ---------------------------------------------------------------- Objectifs */

export function goalProgress(state: AppState, goal: Goal, ref = today()): { current: number; pct: number; label: string } {
  let current = goal.current;
  if (goal.source === 'epargne') {
    current = state.accounts
      .filter((a) => a.type === 'epargne' || a.type === 'investissement')
      .reduce((s, a) => s + accountBalance(state, a.id), 0);
  } else if (goal.source === 'business' && goal.sourceRef) {
    current = businessStats(state, goal.sourceRef, monthKey(ref)).revenue;
  } else if (goal.source === 'habitude' && goal.sourceRef) {
    const h = state.habits.find((x) => x.id === goal.sourceRef);
    current = h ? habitStats(state, h, ref).weekCount : 0;
  }
  const pct = goal.target > 0 ? Math.min(100, (current / goal.target) * 100) : 0;
  const daysLeft = goal.deadline ? daysBetween(ref, goal.deadline) : null;
  const label =
    daysLeft === null ? 'Sans échéance' : daysLeft < 0 ? `En retard de ${-daysLeft} j` : `${daysLeft} j restants`;
  return { current, pct, label };
}

/* --------------------------------------------------------- Vue d'ensemble */

export interface LifeScore {
  total: number;
  parts: Array<{ label: string; value: number }>;
}

/** Score de vie 0-100 : équilibre finances / productivité / santé / business / loisirs. */
export function lifeScore(state: AppState, ref = today()): LifeScore {
  const mKey = monthKey(ref);
  const m = monthTotals(state, mKey);
  const budgets = budgetLines(state, mKey);
  const budgetScore = budgets.length
    ? (budgets.filter((b) => b.pct <= 100).length / budgets.length) * 100
    : m.net >= 0
      ? 80
      : 40;
  const financeScore = Math.max(0, Math.min(100, (m.savingRate + 20) * 2.2)) * 0.5 + budgetScore * 0.5;
  const tasks = taskStats(state);
  const prodScore = Math.max(0, 100 - tasks.late * 12);
  const healthScore = habitsCompletion(state, 14, ref);
  const bizGoal = state.businesses
    .filter((b) => b.status === 'actif' || b.status === 'lancement')
    .map((b) => businessStats(state, b.id, mKey).goalPct);
  const bizScore = bizGoal.length ? Math.min(100, bizGoal.reduce((s, v) => s + v, 0) / bizGoal.length) : 60;
  const leisure = leisureMonth(state, mKey);
  const leisureGoalMin = state.activities.reduce((s, a) => s + a.monthlyHoursGoal * 60, 0);
  const leisureScore = leisureGoalMin > 0 ? Math.min(100, (leisure.minutes / leisureGoalMin) * 100) : 60;

  const parts = [
    { label: 'Finances', value: Math.round(financeScore) },
    { label: 'Productivité', value: Math.round(prodScore) },
    { label: 'Santé & habitudes', value: Math.round(healthScore) },
    { label: 'Business', value: Math.round(bizScore) },
    { label: 'Loisirs', value: Math.round(leisureScore) },
  ];
  return { total: Math.round(parts.reduce((s, p) => s + p.value, 0) / parts.length), parts };
}

/** Bornes du mois courant, utile pour les filtres. */
export function monthRange(mKey: string): { from: string; to: string } {
  const from = startOfMonth(`${mKey}-01`);
  return { from, to: endOfMonth(from) };
}
