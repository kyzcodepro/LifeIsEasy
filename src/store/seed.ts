import type { AppState } from '../types';
import { addDays, addMonths, monthKey, startOfMonth, startOfWeek, today, toISO, fromISO } from '../lib/date';

/** PRNG déterministe : la démo est identique à chaque génération. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const emptyState = (): AppState => ({
  version: 1,
  settings: {
    currency: 'EUR',
    locale: 'fr-FR',
    theme: 'system',
    weekStartsMonday: true,
    userName: '',
    monthlySavingGoal: 400,
    showLifeScore: false,
  },
  accounts: [],
  categories: [],
  transactions: [],
  recurrings: [],
  businesses: [],
  milestones: [],
  events: [],
  tasks: [],
  habits: [],
  habitLogs: {},
  activities: [],
  sessions: [],
  wishes: [],
  goals: [],
});

/** Jeu de données de démonstration : 6 mois d'historique cohérent. */
export function seedState(): AppState {
  const rnd = mulberry32(20260913);
  const now = today();
  const state = emptyState();
  state.settings.userName = 'Alex';

  state.accounts = [
    { id: 'acc_courant', name: 'Compte courant', type: 'courant', initialBalance: 2400 },
    { id: 'acc_livret', name: 'Livret épargne', type: 'epargne', initialBalance: 6800 },
    { id: 'acc_especes', name: 'Espèces', type: 'especes', initialBalance: 120 },
    { id: 'acc_pro', name: 'Compte pro', type: 'business', initialBalance: 3100 },
  ];

  state.categories = [
    { id: 'cat_logement', name: 'Logement', kind: 'depense', budget: 850, slot: 1 },
    { id: 'cat_courses', name: 'Courses', kind: 'depense', budget: 420, slot: 2 },
    { id: 'cat_transport', name: 'Transport', kind: 'depense', budget: 140, slot: 3 },
    { id: 'cat_resto', name: 'Restaurants & sorties', kind: 'depense', budget: 180, slot: 4 },
    { id: 'cat_loisirs', name: 'Loisirs', kind: 'depense', budget: 150, slot: 5 },
    { id: 'cat_sante', name: 'Santé', kind: 'depense', budget: 60, slot: 6 },
    { id: 'cat_abo', name: 'Abonnements', kind: 'depense', budget: 75, slot: 7 },
    { id: 'cat_pro', name: 'Charges business', kind: 'depense', budget: 260, slot: 8 },
    { id: 'cat_salaire', name: 'Salaire', kind: 'revenu', budget: 0, slot: 1 },
    { id: 'cat_ca', name: "Chiffre d'affaires", kind: 'revenu', budget: 0, slot: 3 },
    { id: 'cat_freelance', name: 'Freelance', kind: 'revenu', budget: 0, slot: 4 },
    { id: 'cat_divers', name: 'Revenus divers', kind: 'revenu', budget: 0, slot: 5 },
  ];

  state.businesses = [
    {
      id: 'biz_shop',
      name: 'Boutique e-commerce',
      status: 'actif',
      startDate: addMonths(now, -14),
      monthlyGoal: 2500,
      slot: 3,
      description: 'Vente en ligne d’accessoires — objectif : passer à 2 500 € de CA mensuel.',
    },
    {
      id: 'biz_freelance',
      name: 'Freelance design',
      status: 'actif',
      startDate: addMonths(now, -22),
      monthlyGoal: 1600,
      slot: 4,
      description: 'Missions UI/UX à la journée.',
    },
    {
      id: 'biz_app',
      name: 'App mobile (SaaS)',
      status: 'lancement',
      startDate: addMonths(now, -3),
      monthlyGoal: 800,
      slot: 7,
      description: 'Abonnement mensuel, en cours de lancement.',
    },
  ];

  state.milestones = [
    { id: 'ms_1', businessId: 'biz_shop', title: 'Refonte de la fiche produit', due: addDays(now, 6), done: false },
    { id: 'ms_2', businessId: 'biz_shop', title: 'Négocier le fournisseur #2', due: addDays(now, 20), done: false },
    { id: 'ms_3', businessId: 'biz_shop', title: 'Campagne publicitaire de rentrée', due: addDays(now, -12), done: true },
    { id: 'ms_4', businessId: 'biz_freelance', title: 'Envoyer 5 propositions commerciales', due: addDays(now, 3), done: false },
    { id: 'ms_5', businessId: 'biz_freelance', title: 'Mettre à jour le portfolio', due: addDays(now, -4), done: true },
    { id: 'ms_6', businessId: 'biz_app', title: 'Bêta privée (30 testeurs)', due: addDays(now, 14), done: false },
    { id: 'ms_7', businessId: 'biz_app', title: 'Page de vente en ligne', due: addDays(now, 30), done: false },
  ];

  // --- Transactions sur 6 mois ---
  const tx = state.transactions;
  let n = 0;
  const push = (
    date: string,
    label: string,
    amount: number,
    kind: 'depense' | 'revenu',
    categoryId: string,
    accountId: string,
    businessId?: string,
  ) => {
    tx.push({ id: `tx_${++n}`, date, label, amount: Math.round(amount * 100) / 100, kind, categoryId, accountId, businessId });
  };

  for (let m = 11; m >= 0; m--) {
    const first = startOfMonth(addMonths(now, -m));
    const inThisMonth = (day: number) => {
      const d = addDays(first, day - 1);
      return monthKey(d) === monthKey(first) ? d : first;
    };
    const past = (iso: string) => iso <= now;

    if (past(inThisMonth(2))) push(inThisMonth(2), 'Loyer', 850, 'depense', 'cat_logement', 'acc_courant');
    if (past(inThisMonth(3))) push(inThisMonth(3), 'Électricité & internet', 78 + rnd() * 25, 'depense', 'cat_logement', 'acc_courant');
    if (past(inThisMonth(27))) push(inThisMonth(27), 'Salaire', 2350, 'revenu', 'cat_salaire', 'acc_courant');
    if (past(inThisMonth(5))) push(inThisMonth(5), 'Abonnements (streaming, cloud)', 62, 'depense', 'cat_abo', 'acc_courant');
    if (past(inThisMonth(8))) push(inThisMonth(8), 'Assurance & mutuelle', 46, 'depense', 'cat_sante', 'acc_courant');

    // Courses hebdomadaires
    for (let w = 0; w < 4; w++) {
      const d = inThisMonth(3 + w * 7);
      if (past(d)) push(d, 'Courses alimentaires', 78 + rnd() * 45, 'depense', 'cat_courses', 'acc_courant');
    }
    // Transport
    for (let k = 0; k < 3; k++) {
      const d = inThisMonth(4 + k * 9);
      if (past(d)) push(d, k === 0 ? 'Abonnement transport' : 'Carburant', k === 0 ? 49 : 28 + rnd() * 22, 'depense', 'cat_transport', 'acc_courant');
    }
    // Restaurants / sorties
    for (let k = 0; k < 4; k++) {
      const d = inThisMonth(6 + k * 6);
      if (past(d)) push(d, ['Restaurant', 'Bar entre amis', 'Brunch', 'Livraison'][k], 22 + rnd() * 40, 'depense', 'cat_resto', 'acc_courant');
    }
    // Loisirs
    for (let k = 0; k < 3; k++) {
      const d = inThisMonth(9 + k * 8);
      if (past(d)) push(d, ['Cinéma', 'Salle de sport', 'Livres & jeux'][k], 15 + rnd() * 35, 'depense', 'cat_loisirs', 'acc_courant');
    }
    // Business : CA e-commerce réparti sur le mois
    const shopBase = 900 + (11 - m) * 115;
    for (let k = 0; k < 4; k++) {
      const d = inThisMonth(4 + k * 7);
      if (past(d)) push(d, 'Ventes boutique', (shopBase / 4) * (0.75 + rnd() * 0.5), 'revenu', 'cat_ca', 'acc_pro', 'biz_shop');
    }
    // Freelance
    const missions = 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < missions; k++) {
      const d = inThisMonth(12 + k * 10);
      if (past(d)) push(d, 'Mission freelance', 700 + rnd() * 700, 'revenu', 'cat_freelance', 'acc_pro', 'biz_freelance');
    }
    // SaaS (démarre il y a 3 mois)
    if (m <= 2) {
      const d = inThisMonth(12);
      if (past(d)) push(d, 'Abonnements app', 120 + (2 - m) * 160 + rnd() * 60, 'revenu', 'cat_ca', 'acc_pro', 'biz_app');
    }
    // Charges business
    if (past(inThisMonth(6))) push(inThisMonth(6), 'Publicité en ligne', 120 + rnd() * 90, 'depense', 'cat_pro', 'acc_pro', 'biz_shop');
    if (past(inThisMonth(10))) push(inThisMonth(10), 'Outils & hébergement', 64, 'depense', 'cat_pro', 'acc_pro', 'biz_app');
    if (past(inThisMonth(15)) && rnd() > 0.5) push(inThisMonth(15), 'Remboursement / cashback', 20 + rnd() * 60, 'revenu', 'cat_divers', 'acc_courant');
    // Épargne
    if (past(inThisMonth(28))) push(inThisMonth(28), 'Virement épargne', 350, 'depense', 'cat_logement', 'acc_courant');
  }
  // Retire le faux virement d'épargne de la catégorie logement (garde un historique propre)
  state.transactions = tx.filter((t) => t.label !== 'Virement épargne');

  state.recurrings = [
    { id: 'rec_1', label: 'Loyer', amount: 850, kind: 'depense', categoryId: 'cat_logement', accountId: 'acc_courant', frequency: 'mensuel', anchor: 2, startDate: addMonths(now, -6), active: true, lastRun: now },
    { id: 'rec_2', label: 'Salaire', amount: 2350, kind: 'revenu', categoryId: 'cat_salaire', accountId: 'acc_courant', frequency: 'mensuel', anchor: 27, startDate: addMonths(now, -6), active: true, lastRun: now },
    { id: 'rec_3', label: 'Abonnements', amount: 62, kind: 'depense', categoryId: 'cat_abo', accountId: 'acc_courant', frequency: 'mensuel', anchor: 5, startDate: addMonths(now, -6), active: true, lastRun: now },
    { id: 'rec_4', label: 'Hébergement & outils', amount: 64, kind: 'depense', categoryId: 'cat_pro', accountId: 'acc_pro', businessId: 'biz_app', frequency: 'mensuel', anchor: 10, startDate: addMonths(now, -3), active: true, lastRun: now },
  ];

  // --- Calendrier : semaine type ---
  const monday = startOfWeek(now);
  const ev = state.events;
  let e = 0;
  const addEvent = (
    dayOffset: number,
    title: string,
    start: string,
    end: string,
    domain: AppState['events'][number]['domain'],
    repeat: AppState['events'][number]['repeat'] = 'aucune',
    businessId?: string,
  ) => {
    ev.push({ id: `ev_${++e}`, title, date: addDays(monday, dayOffset), start, end, domain, repeat, businessId, doneDates: [] });
  };

  addEvent(0, 'Deep work — projet client', '09:00', '12:00', 'travail', 'hebdo');
  addEvent(0, 'Sport — musculation', '18:30', '19:45', 'sante', 'hebdo');
  addEvent(1, 'Réunion équipe', '10:00', '11:00', 'travail', 'hebdo');
  addEvent(1, 'Boutique : préparation commandes', '17:00', '18:30', 'business', 'hebdo', 'biz_shop');
  addEvent(2, 'Création de contenu', '09:30', '11:30', 'business', 'hebdo', 'biz_shop');
  addEvent(2, 'Déjeuner avec Camille', '12:30', '14:00', 'perso');
  addEvent(3, 'Développement app', '08:30', '12:00', 'business', 'hebdo', 'biz_app');
  addEvent(3, 'Sport — course à pied', '19:00', '20:00', 'sante', 'hebdo');
  addEvent(4, 'Revue hebdo & planification', '16:00', '17:30', 'perso', 'hebdo');
  addEvent(4, 'Soirée cinéma', '20:30', '23:00', 'loisir');
  addEvent(5, 'Brunch en famille', '11:00', '13:00', 'famille');
  addEvent(5, 'Cours de guitare', '15:00', '16:00', 'loisir', 'hebdo');
  addEvent(6, 'Prépa de la semaine + budget', '18:00', '19:00', 'finances', 'hebdo');
  addEvent(8, 'Rendez-vous fournisseur', '14:00', '15:00', 'business', 'aucune', 'biz_shop');
  addEvent(10, 'Dentiste', '09:00', '09:45', 'sante');

  // --- Tâches ---
  state.tasks = [
    { id: 'tk_1', title: 'Payer la facture d’électricité', domain: 'finances', priority: 'haute', due: addDays(now, 1), done: false, estimate: 10 },
    { id: 'tk_2', title: 'Publier 3 posts boutique', domain: 'business', priority: 'haute', due: now, done: false, businessId: 'biz_shop', estimate: 60 },
    { id: 'tk_3', title: 'Relancer le prospect Martin', domain: 'business', priority: 'normale', due: now, done: false, businessId: 'biz_freelance', estimate: 15 },
    { id: 'tk_4', title: 'Réserver le week-end de novembre', domain: 'loisir', priority: 'basse', due: addDays(now, 9), done: false, estimate: 30 },
    { id: 'tk_5', title: 'Faire le point budget du mois', domain: 'finances', priority: 'normale', due: addDays(now, 4), done: false, estimate: 20 },
    { id: 'tk_6', title: 'Séance kiné', domain: 'sante', priority: 'normale', due: addDays(now, 2), done: false, estimate: 45 },
    { id: 'tk_7', title: 'Corriger le bug paiement', domain: 'business', priority: 'haute', due: addDays(now, -1), done: false, businessId: 'biz_app', estimate: 90 },
    { id: 'tk_8', title: 'Ranger le bureau', domain: 'perso', priority: 'basse', done: true, doneAt: addDays(now, -1), estimate: 25 },
    { id: 'tk_9', title: 'Envoyer la facture client', domain: 'business', priority: 'haute', done: true, doneAt: addDays(now, -2), businessId: 'biz_freelance', estimate: 10 },
    { id: 'tk_10', title: 'Appeler la banque', domain: 'finances', priority: 'normale', done: true, doneAt: addDays(now, -3), estimate: 15 },
  ];

  // Historique de tâches terminées sur 10 semaines (alimente les statistiques)
  const doneTitles = [
    'Déclaration de TVA', 'Rangement du bureau', 'Point budget hebdo', 'Appeler le comptable',
    'Publier la newsletter', 'Réserver le restaurant', 'Commander le matériel', 'Mettre à jour le site',
    'Séance de sport supplémentaire', 'Trier les mails', 'Préparer la semaine', 'Relancer un client',
  ];
  const doneDomains: Array<AppState['tasks'][number]['domain']> = ['finances', 'perso', 'business', 'loisir', 'sante'];
  let dt = 100;
  for (let w = 1; w <= 10; w++) {
    const count = 2 + Math.floor(rnd() * 4);
    for (let k = 0; k < count; k++) {
      const when = addDays(now, -(w * 7) + Math.floor(rnd() * 6));
      state.tasks.push({
        id: `tk_h${++dt}`,
        title: doneTitles[Math.floor(rnd() * doneTitles.length)],
        domain: doneDomains[Math.floor(rnd() * doneDomains.length)],
        priority: 'normale',
        done: true,
        doneAt: when,
        due: when,
        estimate: 15 + Math.floor(rnd() * 6) * 15,
      });
    }
  }

  // --- Habitudes + historique 10 semaines ---
  state.habits = [
    { id: 'hb_sport', name: 'Sport', domain: 'sante', weeklyTarget: 4, slot: 3, archived: false, createdAt: addDays(now, -120) },
    { id: 'hb_lecture', name: 'Lecture 20 min', domain: 'perso', weeklyTarget: 5, slot: 1, archived: false, createdAt: addDays(now, -120) },
    { id: 'hb_business', name: '1 h sur le business', domain: 'business', weeklyTarget: 5, slot: 4, archived: false, createdAt: addDays(now, -120) },
    { id: 'hb_budget', name: 'Noter les dépenses', domain: 'finances', weeklyTarget: 7, slot: 2, archived: false, createdAt: addDays(now, -120) },
    { id: 'hb_meditation', name: 'Méditation', domain: 'sante', weeklyTarget: 3, slot: 5, archived: false, createdAt: addDays(now, -120) },
  ];
  const probs: Record<string, number> = { hb_sport: 0.55, hb_lecture: 0.68, hb_business: 0.7, hb_budget: 0.85, hb_meditation: 0.4 };
  for (let i = 0; i < 84; i++) {
    const d = addDays(now, -i);
    for (const h of state.habits) {
      const boost = i < 21 ? 0.08 : 0; // léger mieux récemment
      if (rnd() < (probs[h.id] ?? 0.5) + boost) state.habitLogs[`${h.id}|${d}`] = true;
    }
  }

  // --- Loisirs ---
  state.activities = [
    { id: 'ac_sport', name: 'Musculation', kind: 'sport', slot: 3, monthlyHoursGoal: 16 },
    { id: 'ac_guitare', name: 'Guitare', kind: 'creatif', slot: 5, monthlyHoursGoal: 8 },
    { id: 'ac_jeux', name: 'Jeux vidéo', kind: 'jeu', slot: 7, monthlyHoursGoal: 10 },
    { id: 'ac_rando', name: 'Randonnée', kind: 'sport', slot: 6, monthlyHoursGoal: 6 },
    { id: 'ac_cine', name: 'Cinéma & séries', kind: 'culture', slot: 1, monthlyHoursGoal: 8 },
  ];
  let s = 0;
  for (let i = 0; i < 70; i++) {
    const d = addDays(now, -i);
    const dow = fromISO(d).getDay();
    const pick = (id: string, chance: number, mins: number, cost: number, rating: number) => {
      if (rnd() < chance) {
        state.sessions.push({
          id: `se_${++s}`,
          activityId: id,
          date: d,
          minutes: Math.round(mins * (0.8 + rnd() * 0.5)),
          cost: Math.round(cost * rnd()),
          rating,
        });
      }
    };
    pick('ac_sport', 0.4, 75, 0, 4);
    pick('ac_guitare', 0.25, 45, 0, 5);
    pick('ac_jeux', 0.3, 90, 5, 4);
    if (dow === 0 || dow === 6) pick('ac_rando', 0.25, 180, 12, 5);
    pick('ac_cine', 0.22, 110, 9, 4);
  }

  state.wishes = [
    { id: 'wi_1', title: 'Week-end à Lisbonne', price: 620, saved: 380, priority: 'haute', target: addMonths(now, 3), bought: false },
    { id: 'wi_2', title: 'Nouvelle guitare', price: 450, saved: 150, priority: 'normale', target: addMonths(now, 5), bought: false },
    { id: 'wi_3', title: 'Écran 4K pour le bureau', price: 380, saved: 380, priority: 'normale', bought: true },
    { id: 'wi_4', title: 'Vélo gravel', price: 1200, saved: 220, priority: 'basse', target: addMonths(now, 9), bought: false },
  ];

  state.goals = [
    { id: 'go_1', title: "Épargner 10 000 € d'ici 12 mois", domain: 'finances', target: 10000, current: 6800, unit: '€', deadline: addMonths(now, 9), source: 'epargne', done: false },
    { id: 'go_2', title: 'Boutique à 2 500 € de CA / mois', domain: 'business', target: 2500, current: 0, unit: '€', deadline: addMonths(now, 6), source: 'business', sourceRef: 'biz_shop', done: false },
    { id: 'go_3', title: 'Sport 4× par semaine', domain: 'sante', target: 4, current: 0, unit: 'séances/sem.', deadline: addMonths(now, 2), source: 'habitude', sourceRef: 'hb_sport', done: false },
    { id: 'go_4', title: 'Lire 12 livres cette année', domain: 'perso', target: 12, current: 7, unit: 'livres', deadline: addMonths(now, 4), source: 'manuel', done: false },
    { id: 'go_5', title: 'Lancer la bêta de l’app', domain: 'business', target: 30, current: 11, unit: 'testeurs', deadline: addMonths(now, 1), source: 'manuel', sourceRef: 'biz_app', done: false },
  ];

  return state;
}

/** Utilisé par les tests manuels et l'onboarding : état vide mais utilisable. */
export function starterState(): AppState {
  const s = emptyState();
  const now = toISO(new Date());
  s.accounts = [{ id: 'acc_main', name: 'Compte courant', type: 'courant', initialBalance: 0 }];
  s.categories = [
    { id: 'cat_logement', name: 'Logement', kind: 'depense', budget: 0, slot: 1 },
    { id: 'cat_courses', name: 'Courses', kind: 'depense', budget: 0, slot: 2 },
    { id: 'cat_transport', name: 'Transport', kind: 'depense', budget: 0, slot: 3 },
    { id: 'cat_loisirs', name: 'Loisirs', kind: 'depense', budget: 0, slot: 5 },
    { id: 'cat_salaire', name: 'Salaire', kind: 'revenu', budget: 0, slot: 1 },
    { id: 'cat_ca', name: "Chiffre d'affaires", kind: 'revenu', budget: 0, slot: 3 },
  ];
  s.settings.userName = '';
  void now;
  return s;
}
