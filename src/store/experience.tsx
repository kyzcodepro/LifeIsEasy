import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from './store';
import { goalProgress } from './selectors';
import { today } from '../lib/date';
import { uid } from '../lib/id';
import { completionChange, planTask, postponedDate } from '../lib/planning';
import type { Task } from '../types';
import { CompletionFeedback } from '../components/ui/CompletionFeedback';

type Notice = { message: string; undo?: () => void };
interface Experience {
  notify: (message: string, undo?: () => void) => void;
  complete: (task: Task) => void;
  postpone: (task: Task) => void;
  schedule: (taskId: string, date: string, start: string) => boolean;
  toggleHabit: (id: string, date: string) => void;
}
const Context = createContext<Experience | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const current = useRef(store);
  current.current = store;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const closeMilestone = useCallback(() => setMilestone(null), []);
  const reached = useRef(new Set(store.state.goals.filter((g) => g.done || goalProgress(store.state, g).pct >= 100).map((g) => g.id)));
  const notify = useCallback((message: string, undo?: () => void) => setNotice({ message, undo }), []);

  useEffect(() => {
    const newlyReached = store.state.goals.filter((g) =>
      (g.done || goalProgress(store.state, g).pct >= 100) && !reached.current.has(g.id));
    for (const g of newlyReached) {
      reached.current.add(g.id);
      if (!g.celebratedAt) store.update('goals', g.id, { celebratedAt: new Date().toISOString() });
    }
    const celebrate = newlyReached.filter((g) => !g.celebratedAt);
    if (celebrate.length) setMilestone(celebrate.map((g) => g.title).join(' · '));
  }, [store]);

  const complete = (task: Task) => {
    const change = completionChange(task, today());
    const event = store.state.events.find((e) => e.taskId === task.id);
    if (event) store.update('events', event.id, { doneDates: task.done ? [] : [event.date] });
    store.update('tasks', task.id, change.next);
    notify(task.done ? 'Tâche rouverte.' : 'Tâche terminée.', () => {
      current.current.update('tasks', task.id, change.previous);
      if (event) current.current.update('events', event.id, { doneDates: event.doneDates });
    });
  };
  const schedule = (taskId: string, date: string, start: string) => {
    const task = current.current.state.tasks.find((t) => t.id === taskId);
    if (!task) { notify('Cette tâche n’existe plus.'); return false; }
    try {
      const previous = current.current.state.events.find((e) => e.taskId === taskId);
      const event = planTask(current.current.state, task, date, start, uid('ev'));
      if (previous) store.update('events', event.id, event);
      else store.add('events', event);
      store.update('tasks', task.id, { due: date });
      notify(`Tâche planifiée à ${start}.`, () => {
        if (previous) current.current.update('events', event.id, previous);
        else current.current.remove('events', event.id);
        current.current.update('tasks', task.id, { due: task.due });
      });
      return true;
    } catch (error) { notify((error as Error).message); return false; }
  };
  const postpone = (task: Task) => {
    const date = postponedDate(task, today());
    const event = store.state.events.find((e) => e.taskId === task.id);
    if (event) { schedule(task.id, date, event.start); return; }
    store.update('tasks', task.id, { due: date });
    notify('Tâche reportée au lendemain.', () => current.current.update('tasks', task.id, { due: task.due }));
  };
  const toggleHabit = (id: string, date: string) => {
    const wasDone = !!store.state.habitLogs[`${id}|${date}`];
    store.toggleHabit(id, date);
    notify(wasDone ? 'Validation retirée.' : 'Habitude validée.', () => {
      if (!!current.current.state.habitLogs[`${id}|${date}`] !== wasDone) current.current.toggleHabit(id, date);
    });
  };

  return <Context.Provider value={{ notify, complete, postpone, schedule, toggleHabit }}>
    {children}
    {notice && <div className="action-notice" role="status">
      <span>{notice.message}</span>
      {notice.undo && <button className="btn btn-sm" onClick={() => { notice.undo?.(); setNotice({ message: 'Action annulée.' }); }}>Annuler</button>}
      <button className="btn btn-ghost btn-icon" aria-label="Fermer le message" onClick={() => setNotice(null)}>×</button>
    </div>}
    {milestone && <CompletionFeedback message={milestone} onClose={closeMilestone} />}
  </Context.Provider>;
}

export function useExperience() {
  const value = useContext(Context);
  if (!value) throw new Error('ExperienceProvider manquant');
  return value;
}
