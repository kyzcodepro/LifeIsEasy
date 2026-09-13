import type { AppState, CalendarEvent, Task } from '../types';
import { eventsOn } from '../store/selectors';
import { addDays, fromISO, toISO, minutesToTime, timeToMinutes } from './date';

export const TASK_DRAG_TYPE = 'application/x-lifeiseasy-task';

export function postponedDate(task: Task, today: string): string {
  return addDays(task.due && task.due > today ? task.due : today, 1);
}

export function completionChange(task: Task, date: string) {
  return {
    next: task.done ? { done: false, doneAt: undefined } : { done: true, doneAt: date },
    previous: { done: task.done, doneAt: task.doneAt },
  };
}

export function dailyPriorities(tasks: Task[], date: string): Task[] {
  const rank = { haute: 0, normale: 1, basse: 2 };
  return tasks.filter((t) => !t.done && (!t.due || t.due <= date))
    .sort((a, b) => rank[a.priority] - rank[b.priority] ||
      (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.id.localeCompare(b.id))
    .slice(0, 3);
}

export function planTask(state: AppState, task: Task, date: string, start: string, id: string): CalendarEvent {
  if (task.done) throw new Error('Cette tâche est déjà terminée.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || toISO(fromISO(date)) !== date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) {
    throw new Error('Choisissez une date et une heure valides.');
  }
  const minutes = timeToMinutes(start);
  const duration = task.estimate && Number.isFinite(task.estimate) && task.estimate > 0 ? Math.ceil(task.estimate) : 30;
  if (minutes + duration > 1440) throw new Error('Ce créneau dépasse minuit. Choisissez une heure plus tôt.');
  const existing = state.events.find((e) => e.taskId === task.id);
  if (eventsOn(state, date).some((e) => e.id !== existing?.id && timeToMinutes(e.start) < minutes + duration && timeToMinutes(e.end) > minutes)) {
    throw new Error('Ce créneau est déjà occupé. Choisissez une autre heure.');
  }
  return { id: existing?.id ?? id, taskId: task.id, title: task.title, domain: task.domain,
    businessId: task.businessId, notes: task.notes, date, start, end: minutesToTime(minutes + duration), repeat: 'aucune' };
}
