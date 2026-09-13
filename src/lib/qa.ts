/**
 * Réponses aux questions, calculées localement sur les données de l'app.
 * Aucun appel réseau : chaque réponse vient des mêmes sélecteurs que les écrans.
 */
import type { AppState, Domain } from '../types';
import {
  accountBalance, budgetLines, businessStats, expensesByCategory, goalProgress, habitStats,
  habitsCompletion, incomeBySource, leisureMonth, lifeScore, monthTotals, netWorth,
  plannedMinutesByDomain, taskStats, tasksDue, txBetween, upcomingEvents,
} from '../store/selectors';
import {
  addDays, addMonths, endOfMonth, formatDate, formatDuration, fromISO, minutesBetween,
  monthKey, monthLabel, relativeDay, startOfMonth, startOfWeek, today,
} from './date';
import { fold, matchBusiness, matchCategory } from './nlu';
import { DOMAIN_META } from './domains';

export interface Answer {
  text: string;
  details?: string[];
  /** Page à ouvrir pour creuser. */
  route?: string;
  routeLabel?: string;
}

interface Period {
  label: string;
  from: string;
  to: string;
  /** Renseigné quand la période correspond exactement à un mois. */
  month?: string;
}

const MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

export function extractPeriod(text: string, now = today()): Period {
  const f = fold(text);
  const thisMonth = monthKey(now);

  if (/\b(aujourd'hui|ce jour)\b/.test(f)) return { label: "aujourd'hui", from: now, to: now };
  if (/\bhier\b/.test(f)) return { label: 'hier', from: addDays(now, -1), to: addDays(now, -1) };
  if (/\b(cette semaine|de la semaine|sur la semaine)\b/.test(f)) {
    return { label: 'cette semaine', from: startOfWeek(now), to: now };
  }
  if (/\b(la semaine derni[èe]re|semaine passee|semaine pass[ée]e)\b/.test(f)) {
    const start = addDays(startOfWeek(now), -7);
    return { label: 'la semaine dernière', from: start, to: addDays(start, 6) };
  }
  if (/\b(le mois dernier|mois pass[ée]|mois precedent|mois pr[ée]c[ée]dent)\b/.test(f)) {
    const key = monthKey(addMonths(startOfMonth(now), -1));
    return { label: monthLabel(key).toLowerCase(), from: `${key}-01`, to: endOfMonth(`${key}-01`), month: key };
  }
  if (/\b(cette ann[ée]e|sur l'ann[ée]e|depuis janvier)\b/.test(f)) {
    return { label: 'cette année', from: `${now.slice(0, 4)}-01-01`, to: now };
  }
  const days = /\b(?:ces |les )?(\d{1,3}) derniers jours\b/.exec(f);
  if (days) {
    const n = Number(days[1]);
    return { label: `les ${n} derniers jours`, from: addDays(now, -(n - 1)), to: now };
  }
  const named = new RegExp(`\\ben (${MONTHS.join('|')})\\b`).exec(f);
  if (named) {
    const idx = MONTHS.indexOf(named[1]);
    const year = idx > fromISO(now).getMonth() ? fromISO(now).getFullYear() - 1 : fromISO(now).getFullYear();
    const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
    return { label: monthLabel(key).toLowerCase(), from: `${key}-01`, to: endOfMonth(`${key}-01`), month: key };
  }
  return { label: 'ce mois-ci', from: startOfMonth(now), to: endOfMonth(now), month: thisMonth };
}

function makeMoney(state: AppState) {
  return (v: number) =>
    new Intl.NumberFormat(state.settings.locale, {
      style: 'currency',
      currency: state.settings.currency,
      maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2,
    }).format(v);
}

type Handler = (ctx: {
  state: AppState;
  text: string;
  now: string;
  period: Period;
  money: (v: number) => string;
}) => Answer | null;

const HANDLERS: Array<[RegExp, Handler]> = [
  // Dépenses (éventuellement par catégorie)
  [
    /(d[ée]pens\w*|co[uû]t[ée]\w*|sorti de mon compte)/i,
    ({ state, text, period, money }) => {
      const category = matchCategory(state, text, 'depense');
      const rows = txBetween(state, period.from, period.to).filter((t) => t.kind === 'depense');
      if (category) {
        const spent = rows.filter((t) => t.categoryId === category.id).reduce((s, t) => s + t.amount, 0);
        const cat = state.categories.find((c) => c.id === category.id);
        const details: string[] = [];
        if (cat && cat.budget > 0 && period.month) {
          const rest = cat.budget - spent;
          details.push(
            rest >= 0
              ? `Budget ${money(cat.budget)} · il reste ${money(rest)} (${Math.round((spent / cat.budget) * 100)} % consommé)`
              : `Budget ${money(cat.budget)} dépassé de ${money(-rest)}`,
          );
        }
        details.push(`${rows.filter((t) => t.categoryId === category.id).length} opérations`);
        return {
          text: `${period.label === "aujourd'hui" ? "Aujourd'hui" : `Sur ${period.label}`}, vous avez dépensé ${money(spent)} en ${category.name.toLowerCase()}.`,
          details,
          route: 'finance',
          routeLabel: 'Voir les opérations',
        };
      }
      const total = rows.reduce((s, t) => s + t.amount, 0);
      const top = period.month
        ? expensesByCategory(state, period.month).slice(0, 3)
        : [...new Map(rows.map((t) => [t.categoryId, 0])).keys()]
            .map((id) => ({
              name: state.categories.find((c) => c.id === id)?.name ?? 'Autre',
              value: rows.filter((t) => t.categoryId === id).reduce((s, t) => s + t.amount, 0),
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
      return {
        text: `Vous avez dépensé ${money(total)} sur ${period.label}, en ${rows.length} opérations.`,
        details: top.map((c) => `${c.name} : ${money(c.value)}`),
        route: 'finance',
        routeLabel: 'Voir les opérations',
      };
    },
  ],

  // Revenus
  [
    /(gagn[ée]\w*|revenus?\b|rentr[ée]es?\b|encaiss[ée]\w*|salaire\w*|touch[ée]\w*)/i,
    ({ state, period, money }) => {
      const rows = txBetween(state, period.from, period.to).filter((t) => t.kind === 'revenu');
      const total = rows.reduce((s, t) => s + t.amount, 0);
      const sources = period.month ? incomeBySource(state, period.month).slice(0, 3) : [];
      return {
        text: `Vous avez gagné ${money(total)} sur ${period.label}.`,
        details: sources.map((s) => `${s.name} : ${money(s.value)}`),
        route: 'finance',
        routeLabel: 'Voir les revenus',
      };
    },
  ],

  // Épargne / reste du mois
  [
    /([ée]pargn\w*|[ée]conomis\w*|reste[- ]t[- ]il|il me reste|solde du mois|mis de c[ôo]t[ée])/i,
    ({ state, period, money }) => {
      const key = period.month ?? monthKey(period.to);
      const t = monthTotals(state, key);
      const goal = state.settings.monthlySavingGoal;
      const details = [`Revenus ${money(t.income)} · dépenses ${money(t.expense)}`];
      if (goal > 0) {
        details.push(
          t.net >= goal
            ? `Objectif d’épargne de ${money(goal)} atteint`
            : `Objectif d’épargne : ${money(goal)} — il manque ${money(goal - t.net)}`,
        );
      }
      return {
        text: `Sur ${monthLabel(key).toLowerCase()}, il vous reste ${money(t.net)}, soit un taux d’épargne de ${t.savingRate.toFixed(0)} %.`,
        details,
        route: 'finance',
        routeLabel: 'Voir le détail',
      };
    },
  ],

  // Patrimoine / comptes
  [
    /(patrimoine|mes comptes|sur mon compte|solde total|combien j'ai (?:en tout|sur mes comptes)|fortune|tr[ée]sorerie)/i,
    ({ state, money }) => ({
      text: `Vos comptes totalisent ${money(netWorth(state))}.`,
      details: state.accounts.map((a) => `${a.name} : ${money(accountBalance(state, a.id))}`),
      route: 'finance',
      routeLabel: 'Voir les comptes',
    }),
  ],

  // Budgets
  [
    /\bbudgets?\b/i,
    ({ state, period, money }) => {
      const key = period.month ?? monthKey(period.to);
      const lines = budgetLines(state, key);
      if (!lines.length) {
        return { text: 'Aucun budget n’est défini pour l’instant.', route: 'recurring', routeLabel: 'Définir des budgets' };
      }
      const over = lines.filter((l) => l.pct > 100);
      return {
        text: over.length
          ? `${over.length} budget${over.length > 1 ? 's' : ''} dépassé${over.length > 1 ? 's' : ''} sur ${lines.length} en ${monthLabel(key).toLowerCase()}.`
          : `Vos ${lines.length} budgets sont tenus en ${monthLabel(key).toLowerCase()}.`,
        details: lines.slice(0, 5).map((l) => `${l.name} : ${money(l.spent)} / ${money(l.budget)} (${l.pct.toFixed(0)} %)`),
        route: 'recurring',
        routeLabel: 'Gérer les budgets',
      };
    },
  ],

  // Business / CA
  [
    /(chiffre d'affaires|\bca\b|business|marge|boutique|client[èe]le)/i,
    ({ state, text, period, money }) => {
      const key = period.month ?? monthKey(period.to);
      const bizId = matchBusiness(state, text);
      const list = bizId ? state.businesses.filter((b) => b.id === bizId) : state.businesses;
      if (!list.length) {
        return { text: 'Aucun business enregistré pour l’instant.', route: 'business', routeLabel: 'Créer un business' };
      }
      const stats = list.map((b) => ({ b, s: businessStats(state, b.id, key) }));
      const total = stats.reduce((s, x) => s + x.s.revenue, 0);
      const margin = stats.reduce((s, x) => s + x.s.margin, 0);
      return {
        text: list.length === 1
          ? `${list[0].name} : ${money(stats[0].s.revenue)} de CA en ${monthLabel(key).toLowerCase()}, soit ${stats[0].s.goalPct.toFixed(0)} % de l’objectif.`
          : `Vos business ont généré ${money(total)} de CA en ${monthLabel(key).toLowerCase()}, pour une marge de ${money(margin)}.`,
        details: stats.map(({ b, s }) => `${b.name} : ${money(s.revenue)} — marge ${money(s.margin)}${s.goal ? ` — ${s.goalPct.toFixed(0)} % de l’objectif` : ''}`),
        route: 'business',
        routeLabel: 'Voir les business',
      };
    },
  ],

  // Temps
  [
    /(temps\b|heures?\b|occup[ée]\w*|planifi[ée]\w*)/i,
    ({ state, period }) => {
      const planned = plannedMinutesByDomain(state, period.from, period.to);
      const entries = (Object.entries(planned) as Array<[Domain, number]>).sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((s, [, v]) => s + v, 0);
      if (!total) return { text: `Rien n’est planifié sur ${period.label}.`, route: 'calendar', routeLabel: 'Ouvrir l’agenda' };
      return {
        text: `Sur ${period.label}, ${formatDuration(total)} sont planifiées, surtout en ${DOMAIN_META[entries[0][0]].label.toLowerCase()}.`,
        details: entries.slice(0, 5).map(([d, v]) => `${DOMAIN_META[d].label} : ${formatDuration(v)} (${Math.round((v / total) * 100)} %)`),
        route: 'stats',
        routeLabel: 'Voir la répartition',
      };
    },
  ],

  // Tâches
  [
    /(t[âa]ches?\b|[àa] faire|en retard|todo\b|priorit[ée]s?\b)/i,
    ({ state, now }) => {
      const stats = taskStats(state);
      const due = tasksDue(state, now).slice(0, 5);
      return {
        text: `${stats.open} tâche${stats.open > 1 ? 's' : ''} ouverte${stats.open > 1 ? 's' : ''}, dont ${stats.late} en retard et ${stats.todayCount} pour aujourd’hui.`,
        details: due.map((t) => `${t.title}${t.due ? ` — ${relativeDay(t.due)}` : ''}`),
        route: 'tasks',
        routeLabel: 'Voir les tâches',
      };
    },
  ],

  // Agenda
  [
    /(agenda\b|pr[ée]vu\w*|rendez[- ]vous|rdv\b|planning\b|journ[ée]e\b|calendrier\b|programme\w*)/i,
    ({ state, text, now }) => {
      const target = /\bdemain\b/i.test(text) ? addDays(now, 1) : now;
      const isTomorrow = target !== now;
      const items = upcomingEvents(state, isTomorrow ? 1 : 0, target).filter((e) => e.date === target);
      const minutes = items.reduce((s, e) => s + minutesBetween(e.event.start, e.event.end), 0);
      if (!items.length) {
        return {
          text: `${isTomorrow ? 'Demain' : "Aujourd'hui"}, rien n’est planifié.`,
          route: 'calendar',
          routeLabel: 'Ouvrir l’agenda',
        };
      }
      return {
        text: `${isTomorrow ? 'Demain' : "Aujourd'hui"} (${formatDate(target, { weekday: true })}) : ${items.length} événement${items.length > 1 ? 's' : ''}, ${formatDuration(minutes)} planifiées.`,
        details: items.map(({ event }) => `${event.start} – ${event.end} · ${event.title}`),
        route: 'calendar',
        routeLabel: 'Ouvrir l’agenda',
      };
    },
  ],

  // Habitudes
  [
    /(habitudes?\b|s[ée]ries?\b|streak\b|r[ée]gularit[ée]|assiduit[ée])/i,
    ({ state, now }) => {
      const habits = state.habits.filter((h) => !h.archived);
      if (!habits.length) return { text: 'Aucune habitude suivie pour l’instant.', route: 'habits', routeLabel: 'Créer une habitude' };
      const rows = habits.map((h) => ({ h, s: habitStats(state, h, now) }));
      return {
        text: `Votre régularité est de ${habitsCompletion(state, 7, now).toFixed(0)} % sur 7 jours et ${habitsCompletion(state, 30, now).toFixed(0)} % sur 30 jours.`,
        details: rows.map(({ h, s }) => `${h.name} : ${s.weekCount}/${h.weeklyTarget} cette semaine — série de ${s.streak} j`),
        route: 'habits',
        routeLabel: 'Voir les habitudes',
      };
    },
  ],

  // Objectifs
  [
    /objectifs?\b/i,
    ({ state, now }) => {
      const active = state.goals.filter((g) => !g.done);
      if (!active.length) return { text: 'Aucun objectif en cours.', route: 'goals', routeLabel: 'Fixer un objectif' };
      const rows = active.map((g) => ({ g, p: goalProgress(state, g, now) }));
      const avg = rows.reduce((s, r) => s + r.p.pct, 0) / rows.length;
      return {
        text: `${active.length} objectif${active.length > 1 ? 's' : ''} en cours, à ${avg.toFixed(0)} % de progression moyenne.`,
        details: rows.map(({ g, p }) => `${g.title} : ${p.pct.toFixed(0)} % — ${p.label}`),
        route: 'goals',
        routeLabel: 'Voir les objectifs',
      };
    },
  ],

  // Loisirs
  [
    /(loisirs?\b|d[ée]tente|plaisir\w*|sorties?\b|hobby)/i,
    ({ state, period, money }) => {
      const key = period.month ?? monthKey(period.to);
      const m = leisureMonth(state, key);
      return {
        text: `En ${monthLabel(key).toLowerCase()}, ${formatDuration(m.minutes)} de loisirs en ${m.count} séances, pour ${money(m.cost)}.`,
        details: m.rating ? [`Plaisir moyen : ${m.rating.toFixed(1)}/5`] : undefined,
        route: 'leisure',
        routeLabel: 'Voir les loisirs',
      };
    },
  ],

  // Bilan général
  [
    /(score\b|[ée]quilibre|bilan\b|comment (?:je vais|[cç]a va)|r[ée]sum[ée]\w*)/i,
    ({ state, now }) => {
      const score = lifeScore(state, now);
      return {
        text: `Votre score de vie est de ${score.total}/100.`,
        details: score.parts.map((p) => `${p.label} : ${p.value}/100`),
        route: 'stats',
        routeLabel: 'Voir les statistiques',
      };
    },
  ],
];

export const SUGGESTIONS = [
  'Combien j’ai dépensé en restaurants ce mois ?',
  'Quel est mon taux d’épargne ?',
  'Où part mon temps cette semaine ?',
  'Quel est le CA de mes business ?',
  'Qu’est-ce que j’ai de prévu demain ?',
  'Où en sont mes objectifs ?',
];

export function answerQuestion(state: AppState, text: string, now = today()): Answer {
  const period = extractPeriod(text, now);
  const money = makeMoney(state);
  // Les mots-clés se cherchent sur une copie sans accents ni apostrophes typographiques.
  const probe = fold(text);
  for (const [re, handler] of HANDLERS) {
    if (!re.test(probe)) continue;
    const answer = handler({ state, text, now, period, money });
    if (answer) return answer;
  }
  return {
    text: 'Je n’ai pas su interpréter cette question. Je sais répondre sur vos dépenses, revenus, épargne, budgets, business, temps, tâches, agenda, habitudes, objectifs et loisirs.',
    details: SUGGESTIONS.slice(0, 4),
  };
}
