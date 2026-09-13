import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { AppState, CollectionItem, CollectionKey, Settings } from '../types';
import { emptyState, seedState, starterState } from './seed';
import { runRecurrings } from './recurring';

const STORAGE_KEY = 'lifeiseasy.state.v1';

type Action =
  | { type: 'add'; coll: CollectionKey; item: unknown }
  | { type: 'update'; coll: CollectionKey; id: string; patch: Record<string, unknown> }
  | { type: 'remove'; coll: CollectionKey; id: string }
  | { type: 'toggleHabit'; habitId: string; date: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add': {
      const list = state[action.coll] as unknown[];
      return { ...state, [action.coll]: [...list, action.item] } as AppState;
    }
    case 'update': {
      const list = state[action.coll] as Array<{ id: string }>;
      return {
        ...state,
        [action.coll]: list.map((it) => (it.id === action.id ? { ...it, ...action.patch } : it)),
      } as AppState;
    }
    case 'remove': {
      const list = state[action.coll] as Array<{ id: string }>;
      const next = { ...state, [action.coll]: list.filter((it) => it.id !== action.id) } as AppState;
      // Nettoyage des références pour éviter les orphelins
      if (action.coll === 'businesses') {
        next.milestones = next.milestones.filter((m) => m.businessId !== action.id);
        next.transactions = next.transactions.map((t) =>
          t.businessId === action.id ? { ...t, businessId: undefined } : t,
        );
        next.events = next.events.map((e) => (e.businessId === action.id ? { ...e, businessId: undefined } : e));
        next.tasks = next.tasks.map((t) => (t.businessId === action.id ? { ...t, businessId: undefined } : t));
      }
      if (action.coll === 'activities') {
        next.sessions = next.sessions.filter((s) => s.activityId !== action.id);
      }
      if (action.coll === 'habits') {
        const logs = { ...next.habitLogs };
        for (const k of Object.keys(logs)) if (k.startsWith(`${action.id}|`)) delete logs[k];
        next.habitLogs = logs;
      }
      return next;
    }
    case 'toggleHabit': {
      const key = `${action.habitId}|${action.date}`;
      const logs = { ...state.habitLogs };
      if (logs[key]) delete logs[key];
      else logs[key] = true;
      return { ...state, habitLogs: logs };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return action.state;
    default:
      return state;
  }
}

function load(): AppState {
  if (typeof window === 'undefined') return seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    // Fusion défensive : un champ ajouté par une future version ne casse pas le chargement.
    const base = emptyState();
    const merged: AppState = { ...base, ...parsed, settings: { ...base.settings, ...(parsed.settings ?? {}) } };
    return runRecurrings(merged);
  } catch {
    return seedState();
  }
}

interface StoreApi {
  state: AppState;
  add: <K extends CollectionKey>(coll: K, item: CollectionItem[K]) => void;
  update: <K extends CollectionKey>(coll: K, id: string, patch: Partial<CollectionItem[K]>) => void;
  remove: (coll: CollectionKey, id: string) => void;
  toggleHabit: (habitId: string, date: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  replaceAll: (state: AppState) => void;
  loadDemo: () => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota dépassé ou stockage bloqué : l'app continue de fonctionner en mémoire */
    }
  }, [state]);

  const api = useMemo<StoreApi>(
    () => ({
      state,
      add: (coll, item) => dispatch({ type: 'add', coll, item }),
      update: (coll, id, patch) => dispatch({ type: 'update', coll, id, patch: patch as Record<string, unknown> }),
      remove: (coll, id) => dispatch({ type: 'remove', coll, id }),
      toggleHabit: (habitId, date) => dispatch({ type: 'toggleHabit', habitId, date }),
      setSettings: (patch) => dispatch({ type: 'settings', patch }),
      replaceAll: (next) => dispatch({ type: 'replace', state: next }),
      loadDemo: () => dispatch({ type: 'replace', state: seedState() }),
      resetAll: () => dispatch({ type: 'replace', state: starterState() }),
    }),
    [state],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return ctx;
}

/** Raccourci pratique : accès direct à l'état. */
export function useAppState(): AppState {
  return useStore().state;
}

/** Formatage monétaire lié aux réglages de l'utilisateur. */
export function useMoney() {
  const { settings } = useAppState();
  return useCallback(
    (v: number, compact = false) =>
      new Intl.NumberFormat(settings.locale, {
        style: 'currency',
        currency: settings.currency,
        maximumFractionDigits: compact || Math.abs(v) >= 1000 ? 0 : 2,
        notation: compact && Math.abs(v) >= 10000 ? 'compact' : 'standard',
      }).format(v),
    [settings.currency, settings.locale],
  );
}

export { STORAGE_KEY };
