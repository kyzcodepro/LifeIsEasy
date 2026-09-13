/**
 * Compréhension du langage naturel, 100 % locale (aucune API, aucune clé).
 *
 * Le principe : on repère dans la phrase des « empreintes » sûres — un montant,
 * une date, une heure, un mot-clé de catégorie — puis on en déduit ce que
 * l'utilisateur veut créer. Chaque extracteur renvoie la portion de texte
 * consommée (`span`), ce qui permet de reconstruire un libellé propre avec le
 * reste de la phrase, accents compris.
 */
import type { AppState, Domain, ID, Priority, TxKind } from '../types';
import { addDays, addMonths, fromISO, minutesToTime, timeToMinutes, today, toISO, weekdayIndex } from './date';

/* ------------------------------------------------------------------ Types */

export interface DraftTransaction {
  type: 'transaction';
  kind: TxKind;
  label: string;
  amount: number;
  date: string;
  categoryId: ID;
  categoryName: string;
  accountId: ID;
  businessId?: ID;
}
export interface DraftTask {
  type: 'task';
  title: string;
  domain: Domain;
  priority: Priority;
  due?: string;
  estimate?: number;
  /** heure précisée : la tâche sera aussi posée dans l'agenda */
  at?: string;
  guessed?: boolean;
}
export interface DraftEvent {
  type: 'event';
  title: string;
  date: string;
  start: string;
  end: string;
  domain: Domain;
}
export interface DraftSession {
  type: 'session';
  activityId: ID;
  activityName: string;
  date: string;
  minutes: number;
  cost: number;
}
export interface DraftHabit {
  type: 'habit';
  name: string;
  domain: Domain;
  weeklyTarget: number;
}
export interface DraftGoal {
  type: 'goal';
  title: string;
  domain: Domain;
  target: number;
  unit: string;
  deadline?: string;
}

export type Draft = DraftTransaction | DraftTask | DraftEvent | DraftSession | DraftHabit | DraftGoal;

export interface Span {
  index: number;
  length: number;
}

/* -------------------------------------------------------------- Utilitaires */

/** Minuscules sans accents : pour comparer des mots, jamais pour afficher. */
export function fold(text: string): string {
  return foldIndexed(text).replace(/\s+/g, ' ').trim();
}

/**
 * Même normalisation, mais sans toucher aux espaces : la chaîne garde la
 * longueur de l'originale, donc les index des correspondances restent valides
 * pour redécouper le texte affiché, accents compris.
 */
function foldIndexed(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’]/g, "'")
    .normalize('NFC');
}

/** Retire du texte les portions déjà consommées, puis nettoie les résidus. */
function cut(text: string, spans: Span[]): string {
  const sorted = [...spans].sort((a, b) => b.index - a.index);
  let out = text;
  for (const s of sorted) out = out.slice(0, s.index) + ' ' + out.slice(s.index + s.length);
  return out.replace(/\s+/g, ' ').trim();
}

const FILLERS = [
  "j'ai", 'jai', 'je', 'me', "m'", 'ai', 'faut', 'il', 'que', 'de', 'du', 'des', 'd', 'le', 'la', 'les',
  'un', 'une', 'au', 'aux', 'a', 'à', 'en', 'pour', 'chez', 'dans', 'sur', 'avec', 'ce', 'cette', 'mon',
  'ma', 'mes', 'et', 'puis', 'aussi', 'vers', 'environ',
];

const VERB_PREFIX =
  /^(?:\s*(?:j['’]ai|jai|je|il faut(?: que je)?|faut(?: que je)?|note(?:r)?|rappelle[- ]moi(?: de| d['’])?|penser? [àa]|pense [àa]|ajoute(?:r)?|cr[ée]e(?:r)?|mets?|planifie(?:r)?|programme(?:r)?|pr[ée]vois|d[ée]pens[ée]\w*|pay[ée]\w*|achet[ée]\w*|r[ée]gl[ée]\w*|co[uû]t[ée]\w*|gagn[ée]\w*|re[çc]u\w*|encaiss[ée]\w*|factur[ée]\w*|vendu|touch[ée]\w*|fait|fais|faire|dois|doit)(?=$|[\s,])[\s,]*)+/i;

/** Nettoie un fragment pour en faire un libellé lisible. */
function label(fragment: string, fallback: string): string {
  let out = fragment.replace(VERB_PREFIX, '').trim();
  // Retire les prépositions et articles isolés en tête
  let changed = true;
  while (changed) {
    changed = false;
    const first = out.split(' ')[0]?.toLowerCase().replace(/[.,;:!?]/g, '');
    if (first && FILLERS.includes(fold(first)) && out.split(' ').length > 1) {
      out = out.slice(out.indexOf(' ') + 1).trim();
      changed = true;
    }
  }
  out = out.replace(/\s*\b(?:d['’]ici|jusqu['’][àa]|avant|pour|de|d['’])\s*$/i, '').trim();
  out = out.replace(/^d['’]/i, '').trim();
  out = out.replace(/^[\s,;:.'’-]+|[\s,;:.]+$/g, '').trim();
  if (!out) return fallback;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/* ------------------------------------------------------------------ Montant */

const AMOUNT_WITH_UNIT =
  /(\d{1,3}(?:[   ]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur\b|euros?\b|balles?\b)/i;
const AMOUNT_AFTER_VERB =
  /(?:d[ée]pens[ée]\w*|pay[ée]\w*|achet[ée]\w*|r[ée]gl[ée]\w*|co[uû]t[ée]\w*|gagn[ée]\w*|re[çc]u\w*|encaiss[ée]\w*|factur[ée]\w*|vendu|touch[ée]\w*|rentr[ée]e? de|prix de)\s+(?:de\s+|pour\s+)?(\d+(?:[.,]\d{1,2})?)\b/i;

export function extractAmount(text: string): { value: number; span: Span } | null {
  for (const re of [AMOUNT_WITH_UNIT, AMOUNT_AFTER_VERB]) {
    const m = re.exec(text);
    if (!m) continue;
    const raw = m[1].replace(/[   ]/g, '').replace(',', '.');
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    const isUnitForm = re === AMOUNT_WITH_UNIT;
    return {
      value,
      span: isUnitForm
        ? { index: m.index, length: m[0].length }
        : { index: m.index + m[0].indexOf(m[1]), length: m[1].length },
    };
  }
  return null;
}

/* --------------------------------------------------------------------- Date */

const MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];
const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function extractDate(text: string, now = today()): { date: string; span: Span } | null {
  const folded = foldIndexed(text);
  const at = (re: RegExp): RegExpExecArray | null => re.exec(folded);

  const rel: Array<[RegExp, number]> = [
    [/\bavant[- ]hier(?: soir| matin| midi)?\b/, -2],
    [/\bhier(?: soir| matin| midi| apr[èe]s[- ]midi)?\b/, -1],
    [/\bapr[èe]s[- ]demain(?: soir| matin| midi)?\b/, 2],
    [/\bdemain(?: soir| matin| midi| apr[èe]s[- ]midi)?\b/, 1],
    [/\b(?:aujourd'hui|ce matin|ce soir|cet apr[èe]s[- ]midi|cet aprem|ce midi|maintenant)\b/, 0],
  ];
  for (const [re, offset] of rel) {
    const m = at(re);
    if (m) return { date: addDays(now, offset), span: { index: m.index, length: m[0].length } };
  }

  const inN = at(/\bdans (\d+) (jours?|semaines?|mois)\b/);
  if (inN) {
    const n = Number(inN[1]);
    const unit = inN[2];
    const date = unit.startsWith('mois') ? addMonths(now, n) : addDays(now, unit.startsWith('semaine') ? n * 7 : n);
    return { date, span: { index: inN.index, length: inN[0].length } };
  }

  const nextWeek = at(/\b(?:la )?semaine prochaine\b/);
  if (nextWeek) return { date: addDays(now, 7), span: { index: nextWeek.index, length: nextWeek[0].length } };
  const nextMonth = at(/\b(?:le )?mois prochain\b/);
  if (nextMonth) return { date: addMonths(now, 1), span: { index: nextMonth.index, length: nextMonth[0].length } };

  const wd = at(new RegExp(`\\b(${WEEKDAYS.join('|')})(\\s+(?:prochain|dernier))?\\b`));
  if (wd) {
    const target = WEEKDAYS.indexOf(wd[1]);
    const cur = weekdayIndex(now);
    const past = (wd[2] ?? '').includes('dernier');
    let delta = past ? -(((cur - target) + 7) % 7 || 7) : ((target - cur) + 7) % 7;
    if (!past && delta === 0) delta = (wd[2] ?? '').includes('prochain') ? 7 : 0;
    return { date: addDays(now, delta), span: { index: wd.index, length: wd[0].length } };
  }

  const numeric = at(/\b(?:le )?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : fromISO(now).getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { date: toISO(new Date(year, month - 1, day)), span: { index: numeric.index, length: numeric[0].length } };
    }
  }

  const named = at(new RegExp(`\\b(?:le )?(\\d{1,2})(?:er)? (${MONTHS.join('|')})( \\d{4})?\\b`));
  if (named) {
    const day = Number(named[1]);
    const month = MONTHS.indexOf(named[2]);
    const year = named[3] ? Number(named[3].trim()) : fromISO(now).getFullYear();
    return { date: toISO(new Date(year, month, day)), span: { index: named.index, length: named[0].length } };
  }

  return null;
}

/* --------------------------------------------------------------------- Heure */

export function extractTimeRange(text: string): { start: string; end: string; span: Span } | null {
  const folded = foldIndexed(text);
  const m = /\b(?:de |entre )?(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(?:a|à|-|jusqu'a)\s*(\d{1,2})\s*(?:h|:)\s*(\d{2})?/.exec(folded);
  if (!m) return null;
  const start = `${String(Math.min(23, Number(m[1]))).padStart(2, '0')}:${m[2] ?? '00'}`;
  const end = `${String(Math.min(23, Number(m[3]))).padStart(2, '0')}:${m[4] ?? '00'}`;
  return { start, end, span: { index: m.index, length: m[0].length } };
}

export function extractTime(text: string): { time: string; span: Span } | null {
  const folded = foldIndexed(text);
  const noon = /\b(midi|minuit)\b/.exec(folded);
  if (noon) return { time: noon[1] === 'midi' ? '12:00' : '00:00', span: { index: noon.index, length: noon[0].length } };
  const m = /\b(?:a |à |vers )?(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?!\s*(?:min|de |d'))/.exec(folded);
  if (!m) return null;
  const hour = Number(m[1]);
  if (hour > 23) return null;
  return {
    time: `${String(hour).padStart(2, '0')}:${m[2] ?? '00'}`,
    span: { index: m.index, length: m[0].length },
  };
}

export function extractDuration(text: string): { minutes: number; span: Span } | null {
  const folded = foldIndexed(text);
  const hm = /\b(?:pendant |durant |de )?(\d{1,2})\s*h(?:\s*(\d{1,2}))?\b(?=\s*(?:de\b|d'|$|[.,;]))/.exec(folded);
  if (hm) {
    const minutes = Number(hm[1]) * 60 + Number(hm[2] ?? 0);
    return { minutes, span: { index: hm.index, length: hm[0].length } };
  }
  const explicit = /\bpendant (\d{1,2})\s*h(?:\s*(\d{1,2}))?\b/.exec(folded);
  if (explicit) {
    return {
      minutes: Number(explicit[1]) * 60 + Number(explicit[2] ?? 0),
      span: { index: explicit.index, length: explicit[0].length },
    };
  }
  const mins = /\b(?:pendant |durant )?(\d{1,3})\s*(?:min|minutes?)\b/.exec(folded);
  if (mins) return { minutes: Number(mins[1]), span: { index: mins.index, length: mins[0].length } };
  return null;
}

/* --------------------------------------------------------------- Catégories */

/** Mots du quotidien → nom de catégorie « canonique ». */
const CATEGORY_HINTS: Array<[RegExp, string, TxKind]> = [
  [/\b(resto|restau|restaurant|pizza|burger|brasserie|bar|caf[ée]|terrasse|brunch|ap[ée]ro|sortie)\b/i, 'restaurants', 'depense'],
  [/\b(courses|supermarch[ée]|[ée]picerie|march[ée]|carrefour|leclerc|lidl|auchan|intermarch[ée]|monoprix)\b/i, 'courses', 'depense'],
  [/\b(loyer|[ée]lectricit[ée]|edf|gaz|internet|box|eau|charges|assurance habitation|logement|meuble)\b/i, 'logement', 'depense'],
  [/\b(essence|carburant|gasoil|diesel|train|sncf|m[ée]tro|bus|uber|taxi|p[ée]age|parking|billet d'avion|transport)\b/i, 'transport', 'depense'],
  [/\b(pharmacie|m[ée]decin|dentiste|mutuelle|kin[ée]|ost[ée]o|analyse|sant[ée]|lunettes)\b/i, 'sant', 'depense'],
  [/\b(abonnement|netflix|spotify|disney|canal|forfait|icloud|prime)\b/i, 'abonnement', 'depense'],
  [/\b(cin[ée]ma|cin[ée]|concert|livre|jeu|jeux|mus[ée]e|spectacle|salle de sport|loisir)\b/i, 'loisir', 'depense'],
  [/\b(publicit[ée]|pub|ads|h[ée]bergement|nom de domaine|logiciel|saas|outil|mat[ée]riel pro|comptable)\b/i, 'business', 'depense'],
  [/\b(salaire|paie|paye|fiche de paie)\b/i, 'salaire', 'revenu'],
  [/\b(mission|freelance|prestation|client|honoraires)\b/i, 'freelance', 'revenu'],
  [/\b(vente|ventes|commande|commandes|boutique|chiffre d'affaires|ca\b)\b/i, 'affaires', 'revenu'],
  [/\b(remboursement|cashback|prime|aide|cadeau|vendu)\b/i, 'divers', 'revenu'],
];

export function matchCategory(state: AppState, text: string, kind: TxKind): { id: ID; name: string } | null {
  const pool = state.categories.filter((c) => c.kind === kind);
  if (!pool.length) return null;
  const folded = fold(text);

  // 1) Le nom exact d'une catégorie apparaît dans la phrase
  for (const c of pool) {
    const first = fold(c.name).split(/[ &]/)[0];
    if (first.length > 3 && folded.includes(first)) return { id: c.id, name: c.name };
  }
  // 2) Un mot du quotidien pointe vers une catégorie canonique
  for (const [re, canonical, hintKind] of CATEGORY_HINTS) {
    if (hintKind !== kind || !re.test(text)) continue;
    const found = pool.find((c) => fold(c.name).includes(canonical));
    if (found) return { id: found.id, name: found.name };
  }
  return null;
}

export function matchBusiness(state: AppState, text: string): ID | undefined {
  const folded = fold(text);
  for (const b of state.businesses) {
    const first = fold(b.name).split(/[ (]/)[0];
    if (first.length > 3 && folded.includes(first)) return b.id;
  }
  return undefined;
}

/* ---------------------------------------------------------------- Domaines */

const DOMAIN_HINTS: Array<[RegExp, Domain]> = [
  [/\b(sport|muscu|musculation|courir|course [àa] pied|running|gym|yoga|piscine|v[ée]lo|m[ée]decin|dentiste|kin[ée]|marche|m[ée]ditation)\b/i, 'sante'],
  [/\b(r[ée]union|meeting|bureau|boulot|travail|dossier|mail|manager|[ée]quipe|entretien)\b/i, 'travail'],
  [/\b(business|boutique|prospect|client|campagne|vente|fournisseur|produit|lancement|devis|facture client)\b/i, 'business'],
  [/\b(budget|banque|imp[oô]ts|comptable|[ée]pargne|virement|assurance|compte)\b/i, 'finances'],
  [/\b(cin[ée]ma|concert|jeu|jeux|guitare|piano|lecture|s[ée]rie|sortie|bar|ap[ée]ro|restaurant|voyage|rando)\b/i, 'loisir'],
  [/\b(famille|maman|papa|parents|enfant|enfants|[ée]cole|cousin|grand-m[èe]re|grand-p[èe]re|anniversaire)\b/i, 'famille'],
];

export function inferDomain(text: string): Domain {
  for (const [re, domain] of DOMAIN_HINTS) if (re.test(text)) return domain;
  return 'perso';
}

function inferPriority(text: string): Priority {
  if (/\b(urgent|urgente|absolument|imp[ée]ratif|important|vite|priorit[ée])\b/i.test(text)) return 'haute';
  if (/\b(quand j'aurai le temps|un de ces jours|si possible|plus tard|pas press[ée])\b/i.test(text)) return 'basse';
  return 'normale';
}

/* ------------------------------------------------------------------ Intents */

/**
 * Verbes d'encaissement. « payé » en est volontairement absent : une fois les
 * accents retirés il se confond avec « paye » (le salaire), et « j'ai payé 32 € »
 * deviendrait un revenu. Seules les tournures explicites comptent.
 */
const REVENUE_RE = /\b(gagn[ée]\w*|re[çc]u\w*|encaiss[ée]\w*|factur[ée]\w*|vendu|touch[ée]\w*|salaire\w*|fiche de paie|rentr[ée]e d'argent|revenus?|rembours[ée]\w*|m['’]a pay[ée]|m['’]ont pay[ée]|client a pay[ée]|vers[ée]\w* sur)\b/i;
const TASK_RE = /\b(rappelle[- ]moi|rappeler|note(?:r)? que|il faut|je dois|penser [àa]|pense [àa]|ne pas oublier|t[âa]che|todo|[àa] faire|faudra)\b/i;
const EVENT_RE = /\b(rendez[- ]vous|rdv|r[ée]union|meeting|d[ée]jeuner|d[îi]ner|appel avec|call|s[ée]ance|cours|entretien|visite|consultation|rencontre|anniversaire|planifie|programme|bloque)\b/i;
const SESSION_RE = /\b(j'ai (?:fait|jou[ée]|courru|couru|nag[ée]|lu)|s[ée]ance de|jou[ée] (?:à|au|aux)|entra[îi]nement|sortie v[ée]lo|rando)\b/i;
const HABIT_RE = /\b(habitude|prendre l'habitude|chaque jour|tous les jours|fois par semaine|par semaine)\b/i;
const GOAL_RE = /\b(objectif|but|je veux atteindre|d'ici (?:\d|la fin)|atteindre)\b/i;

export function isQuestion(text: string): boolean {
  const folded = fold(text);
  if (text.trim().endsWith('?')) return true;
  return /^(combien|quel|quelle|quels|quelles|qu'est|ou |où |est-ce|as-tu|donne[- ]moi|montre[- ]moi|resume|r[ée]sume|liste|affiche|c'est quoi|dis[- ]moi)\b/.test(folded);
}

/** Découpe une phrase en fragments indépendants (« X et Y », « X, puis Y »). */
export function splitFragments(text: string): string[] {
  // Une virgule décimale (« 17,37 € ») n'est pas un séparateur : on la masque
  // le temps de la découpe, puis on la restaure.
  const DECIMAL = '\u0001';
  const masked = text.replace(/(\d),(\d)/g, `$1${DECIMAL}$2`);
  const parts = masked
    .split(/\s*(?:,\s*(?:et\s+|puis\s+)?|\bet ensuite\b|\bpuis\b|\bet aussi\b|;|\bet\b(?=[^,]*\d))\s*/i)
    .map((p) => p.split(DECIMAL).join(',').trim())
    .filter(Boolean);
  if (parts.length < 2) return [text.trim()];
  // Un fragment n'est retenu que s'il porte lui-même un signal exploitable.
  const meaningful = parts.filter(
    (p) => extractAmount(p) || TASK_RE.test(p) || EVENT_RE.test(p) || extractTime(p) || p.split(' ').length > 2,
  );
  return meaningful.length >= 2 ? meaningful : [text.trim()];
}

/* -------------------------------------------------------------- Analyse --- */

export interface ParseResult {
  drafts: Draft[];
  /** La phrase est une question : à traiter par le module de réponses. */
  question: boolean;
}

function parseFragment(state: AppState, fragment: string, now: string): Draft | null {
  /** Copie normalisée : les mots-clés se testent dessus, jamais sur l'affichage. */
  const probe = fold(fragment);
  const amount = extractAmount(fragment);
  const date = extractDate(fragment, now);
  const range = extractTimeRange(fragment);
  const time = range ? null : extractTime(fragment);

  // --- Habitude : « faire du sport 4 fois par semaine »
  const perWeek = /(\d)\s*(?:x|fois)\s*(?:par|\/)\s*semaine/i.exec(fragment);
  if (HABIT_RE.test(probe) && (perWeek || /habitude/i.test(probe)) && !amount) {
    const spans: Span[] = [];
    if (perWeek) spans.push({ index: perWeek.index, length: perWeek[0].length });
    const name = label(
      cut(fragment, spans).replace(/\b(nouvelle |une |prendre l')?habitude( de| d')?\b/i, ''),
      'Nouvelle habitude',
    );
    return {
      type: 'habit',
      name,
      domain: inferDomain(fragment),
      weeklyTarget: perWeek ? Math.min(7, Math.max(1, Number(perWeek[1]))) : 7,
    };
  }

  // --- Objectif : « objectif 10 000 € d'épargne d'ici juin »
  if (GOAL_RE.test(probe) && amount) {
    const spans = [amount.span];
    if (date) spans.push(date.span);
    return {
      type: 'goal',
      title: label(cut(fragment, spans).replace(/\bobjectif\b\s*(de\s*)?/i, ''), 'Nouvel objectif'),
      domain: inferDomain(fragment),
      target: amount.value,
      unit: '€',
      deadline: date?.date,
    };
  }

  // --- Séance de loisir : « j'ai joué 2h de guitare »
  const duration = extractDuration(fragment);
  const activity = state.activities.find((a) => {
    const first = fold(a.name).split(' ')[0];
    return first.length > 3 && fold(fragment).includes(first);
  });
  if (activity && duration && (SESSION_RE.test(probe) || !amount)) {
    return {
      type: 'session',
      activityId: activity.id,
      activityName: activity.name,
      date: date?.date ?? now,
      minutes: duration.minutes,
      cost: amount?.value ?? 0,
    };
  }

  // --- Opération financière : un montant suffit
  if (amount) {
    const isRevenue = REVENUE_RE.test(probe) && !/\b(pay[ée]\w* (?:le|la|les|mon|ma|mes|un|une))\b/i.test(probe);
    const kind: TxKind = isRevenue ? 'revenu' : 'depense';
    const category = matchCategory(state, fragment, kind);
    if (category) {
      const spans = [amount.span];
      if (date) spans.push(date.span);
      const business = matchBusiness(state, fragment);
      const account =
        (business ? state.accounts.find((a) => a.type === 'business') : undefined) ??
        state.accounts.find((a) => a.type === 'courant') ??
        state.accounts[0];
      if (account) {
        return {
          type: 'transaction',
          kind,
          label: label(cut(fragment, spans), category.name),
          amount: amount.value,
          date: date?.date ?? now,
          categoryId: category.id,
          categoryName: category.name,
          accountId: account.id,
          businessId: business,
        };
      }
    }
  }

  // --- Événement : une plage horaire, ou un mot d'agenda avec une heure
  if (range || (EVENT_RE.test(probe) && (time || date))) {
    const spans: Span[] = [];
    if (range) spans.push(range.span);
    if (time) spans.push(time.span);
    if (date) spans.push(date.span);
    const start = range?.start ?? time?.time ?? '09:00';
    const end = range?.end ?? minutesToTime(Math.min(23 * 60 + 59, timeToMinutes(start) + 60));
    return {
      type: 'event',
      title: label(cut(fragment, spans), 'Nouvel événement'),
      date: date?.date ?? now,
      start,
      end,
      domain: inferDomain(fragment),
    };
  }

  // --- Tâche : mot-clé explicite, ou repli raisonnable
  const taskish = TASK_RE.test(probe);
  if (taskish || fragment.trim().split(/\s+/).length >= 2) {
    // « jeudi à 14h » : l'heure de rendez-vous ne doit pas être lue comme une
    // durée de 14 heures — les deux motifs se recouvrent dans le texte.
    const durationIsTime =
      !!duration &&
      !!time &&
      duration.span.index < time.span.index + time.span.length &&
      time.span.index < duration.span.index + duration.span.length;
    const estimate = duration && !durationIsTime ? duration.minutes : undefined;
    const spans: Span[] = [];
    if (date) spans.push(date.span);
    if (time) spans.push(time.span);
    if (estimate !== undefined && !amount) spans.push(duration!.span);
    const title = label(cut(fragment, spans), '');
    if (!title) return null;
    return {
      type: 'task',
      title,
      domain: inferDomain(fragment),
      priority: inferPriority(fragment),
      due: date?.date,
      estimate,
      at: time?.time,
      guessed: !taskish,
    };
  }

  return null;
}

/** Point d'entrée : transforme une phrase en éléments à créer. */
export function parseMessage(state: AppState, text: string, now = today()): ParseResult {
  const trimmed = text.normalize('NFC').trim();
  if (!trimmed) return { drafts: [], question: false };
  if (isQuestion(trimmed)) return { drafts: [], question: true };

  const fragments = splitFragments(trimmed);
  const drafts = fragments.map((f) => parseFragment(state, f, now)).filter((d): d is Draft => d !== null);
  if (drafts.length) return { drafts, question: false };

  const single = parseFragment(state, trimmed, now);
  return { drafts: single ? [single] : [], question: false };
}
