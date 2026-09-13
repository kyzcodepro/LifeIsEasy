/** Modèle de données de Life Is Easy. Tout est stocké localement (localStorage). */

export type ID = string;

/** Domaines de vie : utilisés partout pour le tracking transversal. */
export const DOMAINS = [
  'travail',
  'business',
  'finances',
  'loisir',
  'sante',
  'perso',
  'famille',
] as const;
export type Domain = (typeof DOMAINS)[number];

export type TxKind = 'depense' | 'revenu';

export interface Account {
  id: ID;
  name: string;
  type: 'courant' | 'epargne' | 'especes' | 'business' | 'investissement';
  initialBalance: number;
}

export interface Category {
  id: ID;
  name: string;
  kind: TxKind;
  /** Budget mensuel en devise ; 0 = pas de budget suivi. */
  budget: number;
  slot: number; // index de couleur catégorielle (1..8)
}

export interface Transaction {
  id: ID;
  date: string; // YYYY-MM-DD
  label: string;
  amount: number; // toujours positif
  kind: TxKind;
  categoryId: ID;
  accountId: ID;
  businessId?: ID;
  note?: string;
  /** id du modèle récurrent qui a généré cette transaction */
  recurringId?: ID;
}

export type Frequency = 'hebdo' | 'mensuel' | 'trimestriel' | 'annuel';

export interface Recurring {
  id: ID;
  label: string;
  amount: number;
  kind: TxKind;
  categoryId: ID;
  accountId: ID;
  businessId?: ID;
  frequency: Frequency;
  /** jour du mois (1-31) pour mensuel/trimestriel/annuel, 0-6 (lun-dim) pour hebdo */
  anchor: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  /** dernière date générée automatiquement (YYYY-MM-DD) */
  lastRun?: string;
}

export interface Business {
  id: ID;
  name: string;
  status: 'idee' | 'lancement' | 'actif' | 'pause' | 'arrete';
  startDate: string;
  monthlyGoal: number;
  slot: number;
  description?: string;
}

export interface BusinessMilestone {
  id: ID;
  businessId: ID;
  title: string;
  due?: string;
  done: boolean;
}

export type EventRepeat = 'aucune' | 'quotidien' | 'hebdo' | 'mensuel';

export interface CalendarEvent {
  taskId?: ID;
  id: ID;
  title: string;
  date: string; // YYYY-MM-DD (date de départ pour les récurrences)
  start: string; // HH:MM
  end: string; // HH:MM
  domain: Domain;
  repeat: EventRepeat;
  location?: string;
  notes?: string;
  businessId?: ID;
  /** dates (YYYY-MM-DD) marquées comme faites, pour le tracking du temps planifié */
  doneDates?: string[];
}

export type Priority = 'basse' | 'normale' | 'haute';

export interface Task {
  id: ID;
  title: string;
  domain: Domain;
  priority: Priority;
  due?: string;
  done: boolean;
  doneAt?: string;
  businessId?: ID;
  estimate?: number; // minutes
  notes?: string;
}

export interface Habit {
  id: ID;
  name: string;
  domain: Domain;
  /** nombre de jours visés par semaine (1..7) */
  weeklyTarget: number;
  slot: number;
  archived: boolean;
  createdAt: string;
}

/** Clé : `${habitId}|${YYYY-MM-DD}` */
export type HabitLog = Record<string, true>;

export interface LeisureActivity {
  id: ID;
  name: string;
  kind: 'sport' | 'culture' | 'sortie' | 'jeu' | 'voyage' | 'creatif' | 'autre';
  slot: number;
  /** objectif d'heures par mois */
  monthlyHoursGoal: number;
}

export interface LeisureSession {
  id: ID;
  activityId: ID;
  date: string;
  minutes: number;
  cost: number;
  rating: number; // 1..5
  notes?: string;
}

export interface Wish {
  id: ID;
  title: string;
  price: number;
  saved: number;
  priority: Priority;
  target?: string; // date visée
  url?: string;
  bought: boolean;
}

export interface Goal {
  celebratedAt?: string;
  id: ID;
  title: string;
  domain: Domain;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
  /** source automatique de progression */
  source: 'manuel' | 'epargne' | 'business' | 'habitude';
  sourceRef?: ID;
  notes?: string;
  done: boolean;
}

export interface Settings {
  showLifeScore?: boolean;
  currency: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
  weekStartsMonday: boolean;
  userName: string;
  monthlySavingGoal: number;
  /** Envoyer la phrase dès la fin de la dictée, sans relecture. */
  voiceAutoSend?: boolean;
}

export interface AppState {
  version: number;
  settings: Settings;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurrings: Recurring[];
  businesses: Business[];
  milestones: BusinessMilestone[];
  events: CalendarEvent[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog;
  activities: LeisureActivity[];
  sessions: LeisureSession[];
  wishes: Wish[];
  goals: Goal[];
}

/** Collections manipulables via le CRUD générique du store. */
export type CollectionKey =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'recurrings'
  | 'businesses'
  | 'milestones'
  | 'events'
  | 'tasks'
  | 'habits'
  | 'activities'
  | 'sessions'
  | 'wishes'
  | 'goals';

export type CollectionItem = {
  accounts: Account;
  categories: Category;
  transactions: Transaction;
  recurrings: Recurring;
  businesses: Business;
  milestones: BusinessMilestone;
  events: CalendarEvent;
  tasks: Task;
  habits: Habit;
  activities: LeisureActivity;
  sessions: LeisureSession;
  wishes: Wish;
  goals: Goal;
};
