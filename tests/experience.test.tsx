import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { completionChange, dailyPriorities, planTask, postponedDate } from '../src/lib/planning';
import { emptyState, seedState } from '../src/store/seed';
import { StoreProvider } from '../src/store/store';
import { ExperienceProvider } from '../src/store/experience';
import App from '../src/App';
import { today, addDays } from '../src/lib/date';
import type { Task } from '../src/types';

const date = '2026-09-14';
const task: Task = { id: 'task', title: 'Préparer la semaine', domain: 'perso', priority: 'normale', done: false, estimate: 45 };

test('Valider puis annuler conserve les autres modifications et restaure la date de validation', () => {
  const change = completionChange(task, date);
  const completed = { ...task, ...change.next };
  assert.equal(completed.done, true);
  assert.equal(completed.doneAt, date);
  const restored = { ...completed, title: 'Titre modifié ensuite', ...change.previous };
  assert.equal(restored.done, false);
  assert.equal(restored.doneAt, undefined);
  assert.equal(restored.title, 'Titre modifié ensuite');
  const reopen = completionChange(completed, '2026-09-15');
  assert.equal(reopen.next.done, false);
  assert.deepEqual({ ...completed, ...reopen.next, ...reopen.previous }, completed);
});

test('Report : demain pour une tâche en retard ou sans date, lendemain de l’échéance pour le futur', () => {
  assert.equal(postponedDate(task, date), '2026-09-15');
  assert.equal(postponedDate({ ...task, due: '2026-09-01' }, date), '2026-09-15');
  assert.equal(postponedDate({ ...task, due: '2026-09-30' }, date), '2026-10-01');
});

test('Trois priorités : exclut terminé et futur, trie priorité puis échéance sans muter la liste', () => {
  const tasks = [
    { ...task, id: 'normal', due: date },
    { ...task, id: 'future', due: '2026-09-15', priority: 'haute' as const },
    { ...task, id: 'done', done: true },
    { ...task, id: 'late', due: '2026-09-12', priority: 'haute' as const },
    { ...task, id: 'high', due: date, priority: 'haute' as const },
    { ...task, id: 'idea' },
  ];
  const before = structuredClone(tasks);
  assert.deepEqual(dailyPriorities(tasks, date).map((t) => t.id), ['late', 'high', 'normal']);
  assert.deepEqual(tasks, before);
  assert.deepEqual(dailyPriorities([], date), []);
});

test('Planifier conserve les métadonnées, la durée et le lien tâche, sans modifier l’état', () => {
  const state = emptyState();
  const event = planTask(state, { ...task, businessId: 'biz', notes: 'Brief' }, date, '10:00', 'event');
  assert.equal(event.end, '10:45');
  assert.equal(event.taskId, task.id);
  assert.equal(event.businessId, 'biz');
  assert.equal(event.notes, 'Brief');
  assert.equal(state.events.length, 0);
});

test('Déplacer réutilise le créneau existant et autorise le chevauchement avec lui-même', () => {
  const state = emptyState();
  state.events = [planTask(state, task, date, '10:00', 'original')];
  const moved = planTask(state, task, date, '10:15', 'unused');
  assert.equal(moved.id, 'original');
  assert.equal(moved.end, '11:00');
});

test('Refuse conflits simples et récurrents, mais accepte les créneaux adjacents', () => {
  const state = emptyState();
  state.events = [{ id: 'busy', title: 'Réunion', date: '2026-09-07', start: '10:00', end: '11:00', domain: 'travail', repeat: 'hebdo' }];
  assert.throws(() => planTask(state, task, date, '10:30', 'new'), /occupé/);
  assert.equal(planTask(state, task, date, '11:00', 'new').start, '11:00');
  assert.equal(planTask(state, task, date, '09:15', 'new').end, '10:00');
});

test('Valide les bornes horaires, dates et tâches terminées', () => {
  const state = emptyState();
  assert.equal(planTask(state, { ...task, estimate: 30 }, date, '23:30', 'new').end, '24:00');
  assert.throws(() => planTask(state, task, date, '23:30', 'new'), /minuit/);
  assert.throws(() => planTask(state, task, date, '25:00', 'new'), /valides/);
  assert.throws(() => planTask(state, task, '2026-02-31', '09:00', 'new'), /valides/);
  assert.throws(() => planTask(state, { ...task, done: true }, date, '10:00', 'new'), /terminée/);
  assert.equal(planTask(state, { ...task, estimate: undefined }, date, '10:00', 'new').end, '10:30');
});

function renderRoute(route: string, data = seedState()) {
  Object.assign(globalThis, {
    window: { location: { hash: `/${route}` }, localStorage: { getItem: () => JSON.stringify(data) } },
    document: { activeElement: null },
  });
  return renderToStaticMarkup(<StoreProvider><ExperienceProvider><App /></ExperienceProvider></StoreProvider>);
}

test('Accueil limité à trois priorités avec capture rapide, sans synthèse financière ni score par défaut', () => {
  const data = emptyState();
  data.tasks = Array.from({ length: 5 }, (_, i) => ({ ...task, id: String(i), title: `Priorité ${i}`, due: today() }));
  data.tasks.push({ ...task, id: 'future', title: 'Tâche future', due: addDays(today(), 1) });
  const html = renderRoute('dashboard', data);
  assert.equal((html.match(/class="priority-row"/g) ?? []).length, 3);
  assert.match(html, /Une idée, une tâche/);
  assert.doesNotMatch(html, /Patrimoine net|Mon indicateur personnel|Tâche future/);
});

test('Préférence score respectée dans accueil et statistiques, y compris après rechargement', () => {
  const data = seedState();
  delete data.settings.showLifeScore; // sauvegarde de l’ancienne version
  assert.doesNotMatch(renderRoute('stats', data), /Mon indicateur personnel|Équilibre de vie/);
  data.settings.showLifeScore = true;
  for (const route of ['dashboard', 'stats']) {
    const html = renderRoute(route, data);
    assert.match(html, /Mon indicateur personnel/);
    assert.match(html, /Comprendre le calcul/);
  }
});

test('Toutes les routes conservent un rendu et aucun objectif existant ne déclenche une fête au chargement', () => {
  for (const route of ['dashboard', 'calendar', 'tasks', 'finance', 'business', 'recurring', 'leisure', 'habits', 'goals', 'stats', 'settings']) {
    const html = renderRoute(route);
    assert.match(html, /id="main-content"/);
    assert.doesNotMatch(html, /class="celebration"/);
  }
});
