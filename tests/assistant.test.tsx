import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { extractAmount, extractDate, extractDuration, extractTime, extractTimeRange, isQuestion, parseMessage, splitFragments } from '../src/lib/nlu';
import { answerQuestion, extractPeriod } from '../src/lib/qa';
import { seedState } from '../src/store/seed';
import { StoreProvider } from '../src/store/store';
import { ExperienceProvider } from '../src/store/experience';
import { AssistantPage } from '../src/pages/Assistant';
import { clearTranscript, getTranscript, setTranscript } from '../src/lib/transcript';
import { monthKey } from '../src/lib/date';

const state = seedState();
const now = '2026-09-13'; // un dimanche

test('Montants : symbole, séparateur de milliers, décimales et montant collé au verbe', () => {
  assert.equal(extractAmount('32 €')?.value, 32);
  assert.equal(extractAmount('32,50 €')?.value, 32.5);
  assert.equal(extractAmount('1 200 €')?.value, 1200);
  assert.equal(extractAmount('j’ai dépensé 45 au marché')?.value, 45);
  assert.equal(extractAmount('rien à signaler'), null);
});

test('Dates : relatives, jour de la semaine, « dans N », numérique et nom de mois', () => {
  assert.equal(extractDate('hier soir', now)?.date, '2026-09-12');
  assert.equal(extractDate('avant-hier', now)?.date, '2026-09-11');
  assert.equal(extractDate('demain', now)?.date, '2026-09-14');
  assert.equal(extractDate('après-demain', now)?.date, '2026-09-15');
  assert.equal(extractDate('jeudi', now)?.date, '2026-09-17');
  assert.equal(extractDate('jeudi dernier', now)?.date, '2026-09-10');
  assert.equal(extractDate('dans 3 jours', now)?.date, '2026-09-16');
  assert.equal(extractDate('la semaine prochaine', now)?.date, '2026-09-20');
  assert.equal(extractDate('le 12/03', now)?.date, '2026-03-12');
  assert.equal(extractDate('le 31 décembre', now)?.date, '2026-12-31');
  assert.equal(extractDate('sans date', now), null);
});

test('Heures : plage, heure simple, midi et durées', () => {
  assert.deepEqual(
    { start: extractTimeRange('de 10h à 11h30')?.start, end: extractTimeRange('de 10h à 11h30')?.end },
    { start: '10:00', end: '11:30' },
  );
  assert.equal(extractTime('à 14h')?.time, '14:00');
  assert.equal(extractTime('à 9h05')?.time, '09:05');
  assert.equal(extractTime('midi')?.time, '12:00');
  assert.equal(extractDuration('1h30 de guitare')?.minutes, 90);
  assert.equal(extractDuration('pendant 45 min')?.minutes, 45);
});

test('Dépense : montant, catégorie devinée, date, et libellé nettoyé des verbes', () => {
  const { drafts } = parseMessage(state, 'J’ai payé 32 € au restaurant hier soir', now);
  assert.equal(drafts.length, 1);
  const draft = drafts[0];
  assert.equal(draft.type, 'transaction');
  if (draft.type !== 'transaction') return;
  assert.equal(draft.kind, 'depense');
  assert.equal(draft.amount, 32);
  assert.equal(draft.date, '2026-09-12');
  assert.equal(draft.categoryName, 'Restaurants & sorties');
  assert.match(draft.label, /restaurant/i);
  assert.doesNotMatch(draft.label, /pay|32|hier/i);
});

test('Revenu : un verbe d’encaissement bascule le sens de l’opération', () => {
  const { drafts } = parseMessage(state, 'J’ai reçu 1 200 € du client pour la mission', now);
  const draft = drafts[0];
  assert.equal(draft.type, 'transaction');
  if (draft.type !== 'transaction') return;
  assert.equal(draft.kind, 'revenu');
  assert.equal(draft.amount, 1200);
  assert.equal(draft.categoryName, 'Freelance');
});

test('Une virgule décimale ne coupe pas la phrase en deux', () => {
  assert.deepEqual(splitFragments('J’ai payé 17,37 € de cinéma hier'), ['J’ai payé 17,37 € de cinéma hier']);
  const draft = parseMessage(state, 'J’ai payé 17,37 € de cinéma hier', now).drafts[0];
  assert.equal(draft.type, 'transaction');
  if (draft.type !== 'transaction') return;
  assert.equal(draft.amount, 17.37);
  assert.equal(draft.categoryName, 'Loisirs');
  assert.equal(draft.date, '2026-09-12');
});

test('Deux opérations dans une seule phrase', () => {
  assert.deepEqual(splitFragments('courses 54 € et essence 40 €'), ['courses 54 €', 'essence 40 €']);
  const { drafts } = parseMessage(state, 'Courses 54 € et essence 40 €', now);
  assert.equal(drafts.length, 2);
  const names = drafts.map((d) => (d.type === 'transaction' ? d.categoryName : d.type));
  assert.deepEqual(names, ['Courses', 'Transport']);
});

test('Tâche : échéance, domaine déduit et heure conservée pour la planification', () => {
  const { drafts } = parseMessage(state, 'Rappelle-moi d’appeler le comptable jeudi à 14h', now);
  const draft = drafts[0];
  assert.equal(draft.type, 'task');
  if (draft.type !== 'task') return;
  assert.equal(draft.title, 'Appeler le comptable');
  assert.equal(draft.due, '2026-09-17');
  assert.equal(draft.at, '14:00');
  assert.equal(draft.domain, 'finances');
  assert.equal(draft.guessed, false);
  // « à 14h » est une heure de rendez-vous, pas une durée de 14 heures
  assert.equal(draft.estimate, undefined);
});

test('Une durée explicite reste une durée', () => {
  const draft = parseMessage(state, 'Rappelle-moi de relire le dossier pendant 45 min demain', now).drafts[0];
  assert.equal(draft.type, 'task');
  if (draft.type !== 'task') return;
  assert.equal(draft.estimate, 45);
  assert.equal(draft.due, '2026-09-14');
  assert.doesNotMatch(draft.title, /45|demain/i);
});

test('Événement : plage horaire explicite, titre et domaine', () => {
  const { drafts } = parseMessage(state, 'Réunion équipe demain de 10h à 11h30', now);
  const draft = drafts[0];
  assert.equal(draft.type, 'event');
  if (draft.type !== 'event') return;
  assert.equal(draft.title, 'Réunion équipe');
  assert.equal(draft.date, '2026-09-14');
  assert.equal(draft.start, '10:00');
  assert.equal(draft.end, '11:30');
  assert.equal(draft.domain, 'travail');
});

test('Séance de loisir : activité existante reconnue et durée convertie', () => {
  const { drafts } = parseMessage(state, 'J’ai joué 1h30 de guitare', now);
  const draft = drafts[0];
  assert.equal(draft.type, 'session');
  if (draft.type !== 'session') return;
  assert.equal(draft.activityName, 'Guitare');
  assert.equal(draft.minutes, 90);
  assert.equal(draft.date, now);
});

test('Habitude et objectif', () => {
  const habit = parseMessage(state, 'Nouvelle habitude méditation 5 fois par semaine', now).drafts[0];
  assert.equal(habit.type, 'habit');
  if (habit.type === 'habit') {
    assert.equal(habit.name, 'Méditation');
    assert.equal(habit.weeklyTarget, 5);
    assert.equal(habit.domain, 'sante');
  }
  const goal = parseMessage(state, 'Objectif 5000 € d’épargne d’ici le 31 décembre', now).drafts[0];
  assert.equal(goal.type, 'goal');
  if (goal.type === 'goal') {
    assert.equal(goal.target, 5000);
    assert.equal(goal.deadline, '2026-12-31');
  }
});

test('Phrase incompréhensible : aucun élément inventé', () => {
  assert.deepEqual(parseMessage(state, 'zzz', now).drafts, []);
  assert.deepEqual(parseMessage(state, '   ', now).drafts, []);
});

test('Une phrase sans mot-clé reste une tâche, mais marquée comme déduite', () => {
  const draft = parseMessage(state, 'Acheter du pain', now).drafts[0];
  assert.equal(draft.type, 'task');
  if (draft.type !== 'task') return;
  assert.equal(draft.guessed, true);
  assert.equal(draft.due, undefined);
});

test('Les questions ne créent jamais rien', () => {
  for (const q of ['Combien j’ai dépensé en restaurants ce mois ?', 'Quel est mon taux d’épargne ?', 'Où part mon temps cette semaine ?']) {
    const parsed = parseMessage(state, q, now);
    assert.equal(parsed.question, true, q);
    assert.deepEqual(parsed.drafts, [], q);
  }
  assert.equal(isQuestion('j’ai payé 32 € au restaurant'), false);
});

test('Périodes : semaine dernière, mois dernier, mois nommé et 7 derniers jours', () => {
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(extractPeriod('la semaine dernière', now)),
    { from: '2026-08-31', to: '2026-09-06' },
  );
  assert.equal(extractPeriod('le mois dernier', now).month, '2026-08');
  assert.equal(extractPeriod('en août', now).month, '2026-08');
  assert.equal(extractPeriod('ces 7 derniers jours', now).from, '2026-09-07');
  assert.equal(extractPeriod('sans repère', now).month, monthKey(now));
});

test('Réponses : dépenses par catégorie, épargne, agenda et repli explicite', () => {
  const spent = answerQuestion(state, 'Combien j’ai dépensé en restaurants ce mois ?', now);
  assert.match(spent.text, /dépensé/i);
  assert.match(spent.text, /restaurants/i);
  assert.equal(spent.route, 'finance');

  const saving = answerQuestion(state, 'Quel est mon taux d’épargne ?', now);
  assert.match(saving.text, /taux d’épargne/i);

  const agenda = answerQuestion(state, 'Qu’est-ce que j’ai de prévu demain ?', now);
  assert.match(agenda.text, /Demain/);

  const unknown = answerQuestion(state, 'Quelle est la capitale du Pérou ?', now);
  assert.match(unknown.text, /pas su interpréter/i);
  assert.ok((unknown.details ?? []).length > 0);
});

test('Le fil de conversation survit à un changement de page', () => {
  clearTranscript();
  assert.deepEqual(getTranscript(), []);
  let undone = false;
  setTranscript([{ id: 'm1', role: 'assistant', text: 'C’est noté.', undo: () => { undone = true; } }]);
  // Un remontage de la page repart du fil conservé, boutons d'annulation compris.
  const kept = getTranscript();
  assert.equal(kept.length, 1);
  kept[0].undo?.();
  assert.equal(undone, true);
  clearTranscript();
  assert.deepEqual(getTranscript(), []);
});

test('La page Assistant se rend sans erreur avec les données de démonstration', () => {
  const html = renderToStaticMarkup(
    <StoreProvider>
      <ExperienceProvider>
        <AssistantPage onNavigate={() => {}} />
      </ExperienceProvider>
    </StoreProvider>,
  );
  assert.match(html, /Assistant/);
  assert.match(html, /aucune donnée ne quitte votre appareil/i);
});
