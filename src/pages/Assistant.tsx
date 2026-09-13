import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { useMoney, useStore } from '../store/store';
import { useExperience } from '../store/experience';
import { parseMessage } from '../lib/nlu';
import type { Draft } from '../lib/nlu';
import { answerQuestion, SUGGESTIONS } from '../lib/qa';
import { planTask } from '../lib/planning';
import { formatDate, formatDuration, today } from '../lib/date';
import { uid } from '../lib/id';
import { DOMAIN_META, domainColor } from '../lib/domains';
import { clearTranscript, getTranscript, setTranscript } from '../lib/transcript';
import type { ChatCreated as Created, ChatMessage as Message } from '../lib/transcript';
import type { CalendarEvent, Task } from '../types';

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Écrivez ce que vous avez fait ou ce que vous devez faire, en une phrase. Je le range au bon endroit — dépense, tâche, événement, séance de loisir — et vous pouvez tout annuler d’un clic. Posez-moi aussi des questions sur vos données.',
};

const EXAMPLES = [
  'J’ai payé 32 € au restaurant hier soir',
  'Rappelle-moi d’appeler le comptable jeudi à 14h',
  'Réunion équipe demain de 10h à 11h30',
  'Courses 54 € et essence 40 €',
  'J’ai joué 1h30 de guitare',
  'Combien j’ai dépensé en restaurants ce mois ?',
];

export function AssistantPage({ onNavigate }: { onNavigate: (id: string) => void }) {
  const store = useStore();
  const { state, add, remove } = store;
  const { notify } = useExperience();
  const money = useMoney();
  const now = today();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const kept = getTranscript();
    return kept.length ? kept : [{ ...WELCOME, details: EXAMPLES.slice(0, 3).map((e) => `« ${e} »`) }];
  });
  const logRef = useRef<HTMLDivElement | null>(null);

  // Le fil survit aux changements de page (mais pas à un rechargement complet).
  useEffect(() => {
    setTranscript(messages);
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const describe = useMemo(
    () =>
      (draft: Draft): Created => {
        switch (draft.type) {
          case 'transaction':
            return {
              title: `${draft.kind === 'revenu' ? 'Revenu' : 'Dépense'} · ${draft.label}`,
              chips: [
                money(draft.amount),
                draft.categoryName,
                formatDate(draft.date, { weekday: true }),
                state.accounts.find((a) => a.id === draft.accountId)?.name ?? '',
              ].filter(Boolean),
              color: draft.kind === 'revenu' ? 'var(--good)' : 'var(--s2)',
            };
          case 'task':
            return {
              title: `Tâche · ${draft.title}`,
              chips: [
                DOMAIN_META[draft.domain].label,
                draft.due ? formatDate(draft.due, { weekday: true }) : 'Sans échéance',
                draft.priority === 'haute' ? 'Priorité haute' : '',
                draft.estimate ? formatDuration(draft.estimate) : '',
              ].filter(Boolean),
              color: domainColor(draft.domain),
            };
          case 'event':
            return {
              title: `Événement · ${draft.title}`,
              chips: [formatDate(draft.date, { weekday: true }), `${draft.start} – ${draft.end}`, DOMAIN_META[draft.domain].label],
              color: domainColor(draft.domain),
            };
          case 'session':
            return {
              title: `Séance · ${draft.activityName}`,
              chips: [formatDuration(draft.minutes), formatDate(draft.date, { weekday: true }), draft.cost ? money(draft.cost) : ''].filter(Boolean),
              color: 'var(--s5)',
            };
          case 'habit':
            return {
              title: `Habitude · ${draft.name}`,
              chips: [`${draft.weeklyTarget}×/semaine`, DOMAIN_META[draft.domain].label],
              color: domainColor(draft.domain),
            };
          case 'goal':
            return {
              title: `Objectif · ${draft.title}`,
              chips: [`${draft.target} ${draft.unit}`, draft.deadline ? `d’ici ${formatDate(draft.deadline, { withYear: true })}` : 'sans échéance'],
              color: domainColor(draft.domain),
            };
        }
      },
    [money, state.accounts],
  );

  /** Crée réellement l'élément et renvoie de quoi l'annuler. */
  const apply = (draft: Draft): { undo: () => void; note?: string } => {
    switch (draft.type) {
      case 'transaction': {
        const id = uid('tx');
        add('transactions', {
          id,
          date: draft.date,
          label: draft.label,
          amount: draft.amount,
          kind: draft.kind,
          categoryId: draft.categoryId,
          accountId: draft.accountId,
          businessId: draft.businessId,
        });
        return { undo: () => remove('transactions', id) };
      }
      case 'task': {
        const id = uid('tk');
        const task: Task = {
          id,
          title: draft.title,
          domain: draft.domain,
          priority: draft.priority,
          due: draft.due,
          done: false,
          estimate: draft.estimate,
        };
        add('tasks', task);
        let event: CalendarEvent | null = null;
        if (draft.at && draft.due) {
          try {
            event = planTask(state, task, draft.due, draft.at, uid('ev'));
            add('events', event);
          } catch {
            event = null; // créneau occupé ou heure invalide : la tâche seule suffit
          }
        }
        return {
          undo: () => {
            remove('tasks', id);
            if (event) remove('events', event.id);
          },
          note: event
            ? `Posée dans l’agenda à ${event.start}.`
            : draft.at
              ? 'Le créneau demandé était pris : la tâche est créée sans horaire.'
              : draft.guessed
                ? 'Rangée en tâche, faute d’un montant ou d’un horaire dans la phrase.'
                : undefined,
        };
      }
      case 'event': {
        const id = uid('ev');
        add('events', {
          id,
          title: draft.title,
          date: draft.date,
          start: draft.start,
          end: draft.end,
          domain: draft.domain,
          repeat: 'aucune',
          doneDates: [],
        });
        return { undo: () => remove('events', id) };
      }
      case 'session': {
        const id = uid('se');
        add('sessions', {
          id,
          activityId: draft.activityId,
          date: draft.date,
          minutes: draft.minutes,
          cost: draft.cost,
          rating: 4,
        });
        return { undo: () => remove('sessions', id) };
      }
      case 'habit': {
        const id = uid('hb');
        add('habits', {
          id,
          name: draft.name,
          domain: draft.domain,
          weeklyTarget: draft.weeklyTarget,
          slot: (state.habits.length % 8) + 1,
          archived: false,
          createdAt: now,
        });
        return { undo: () => remove('habits', id) };
      }
      case 'goal': {
        const id = uid('go');
        add('goals', {
          id,
          title: draft.title,
          domain: draft.domain,
          target: draft.target,
          current: 0,
          unit: draft.unit,
          deadline: draft.deadline,
          source: 'manuel',
          done: false,
        });
        return { undo: () => remove('goals', id) };
      }
    }
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setInput('');
    const userMessage: Message = { id: uid('m'), role: 'user', text };

    const parsed = parseMessage(state, text, now);

    if (parsed.question) {
      const answer = answerQuestion(state, text, now);
      setMessages((m) => [
        ...m,
        userMessage,
        { id: uid('m'), role: 'assistant', text: answer.text, details: answer.details, route: answer.route, routeLabel: answer.routeLabel },
      ]);
      return;
    }

    if (!parsed.drafts.length) {
      setMessages((m) => [
        ...m,
        userMessage,
        {
          id: uid('m'),
          role: 'assistant',
          text: 'Je n’ai pas réussi à en tirer quelque chose. Essayez une phrase avec un montant, une date ou une heure — ou posez-moi une question.',
          details: EXAMPLES.map((e) => `« ${e} »`),
        },
      ]);
      return;
    }

    const created: Created[] = [];
    const undos: Array<() => void> = [];
    const notes: string[] = [];
    for (const draft of parsed.drafts) {
      const result = apply(draft);
      created.push(describe(draft));
      undos.push(result.undo);
      if (result.note) notes.push(result.note);
    }
    const undo = () => undos.forEach((fn) => fn());

    setMessages((m) => [
      ...m,
      userMessage,
      {
        id: uid('m'),
        role: 'assistant',
        text: created.length > 1 ? `C’est noté — ${created.length} éléments créés.` : 'C’est noté.',
        details: notes.length ? notes : undefined,
        created,
        undo,
      },
    ]);
    notify(created.length > 1 ? `${created.length} éléments créés.` : 'Élément créé.', undo);
  };

  return (
    <>
      <Card
        title="Assistant"
        subtitle="Analyse locale de vos phrases — aucune donnée ne quitte votre appareil"
        className="chat-card"
        actions={
          messages.length > 1 ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                clearTranscript();
                setMessages([{ ...WELCOME, details: EXAMPLES.slice(0, 3).map((e) => `« ${e} »`) }]);
              }}
            >
              Effacer la conversation
            </button>
          ) : undefined
        }
      >
        <div className="chat-log" ref={logRef}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.role}`}>
              <div className="chat-bubble">
                <p>{m.text}</p>
                {m.created && (
                  <div className="chat-created">
                    {m.created.map((c, i) => (
                      <div className="chat-item" key={i} style={{ borderLeftColor: c.color }}>
                        <span className="chat-item-title">{c.title}</span>
                        <span className="chat-item-chips">
                          {c.chips.map((chip) => (
                            <span className="chip" key={chip}>
                              {chip}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {m.details && (
                  <ul className="chat-details">
                    {m.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
                {(m.undo || m.route) && (
                  <div className="chat-actions">
                    {m.undo && (
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          m.undo?.();
                          setMessages((list) =>
                            list.map((x) =>
                              x.id === m.id ? { ...x, text: 'Annulé — rien n’a été conservé.', created: undefined, details: undefined, undo: undefined } : x,
                            ),
                          );
                        }}
                      >
                        Annuler
                      </button>
                    )}
                    {m.route && (
                      <button className="btn btn-sm btn-ghost" onClick={() => onNavigate(m.route!)}>
                        {m.routeLabel ?? 'Voir'}
                        <Icon name="chevronRight" size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="chat-suggestions">
          {(messages.length <= 1 ? EXAMPLES : SUGGESTIONS).slice(0, 4).map((s) => (
            <button key={s} className="chip chat-suggestion" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex. : j’ai payé 45 € de courses hier, et rappelle-moi d’appeler la banque lundi"
            aria-label="Votre phrase"
            autoComplete="off"
          />
          <button className="btn btn-primary" type="submit" aria-label="Envoyer">
            <Icon name="send" size={16} />
          </button>
        </form>
      </Card>

      <Card title="Ce que je comprends" subtitle="Sans connexion, sans clé, sans envoi de données">
        <div className="grid grid-2">
          <div>
            <h3 style={{ marginBottom: 6 }}>Créer</h3>
            <ul className="chat-details">
              <li>Dépenses et revenus : montant, catégorie devinée, date, compte, business</li>
              <li>Tâches : échéance, priorité, durée — posées dans l’agenda si vous donnez une heure</li>
              <li>Événements : « demain de 10h à 11h30 », « jeudi 14h »</li>
              <li>Séances de loisir : « j’ai joué 1h30 de guitare »</li>
              <li>Habitudes et objectifs : « habitude sport 4 fois par semaine »</li>
              <li>Plusieurs éléments d’un coup : « courses 54 € et essence 40 € »</li>
            </ul>
          </div>
          <div>
            <h3 style={{ marginBottom: 6 }}>Répondre</h3>
            <ul className="chat-details">
              <li>Dépenses, revenus, épargne, patrimoine, budgets</li>
              <li>CA et marge de vos business</li>
              <li>Répartition de votre temps, agenda du jour et de demain</li>
              <li>Tâches ouvertes et en retard, habitudes, objectifs, loisirs</li>
              <li>Périodes : « ce mois », « la semaine dernière », « en août », « les 7 derniers jours »</li>
            </ul>
          </div>
        </div>
      </Card>
    </>
  );
}
