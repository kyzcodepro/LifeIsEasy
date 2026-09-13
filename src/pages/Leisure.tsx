import { useState } from 'react';
import { Card, EmptyState, ProgressBar, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Field, NumberInput, Select, TextArea, TextInput } from '../components/ui/Field';
import { slotColor } from '../components/charts/util';
import { useMoney, useStore } from '../store/store';
import { leisureByActivity, leisureMonth } from '../store/selectors';
import { formatDate, formatDuration, monthLabel, today } from '../lib/date';
import { uid } from '../lib/id';
import type { LeisureActivity, LeisureSession, Priority, Wish } from '../types';

const KIND_OPTIONS: Array<{ value: LeisureActivity['kind']; label: string }> = [
  { value: 'sport', label: 'Sport' },
  { value: 'culture', label: 'Culture' },
  { value: 'sortie', label: 'Sortie' },
  { value: 'jeu', label: 'Jeu' },
  { value: 'voyage', label: 'Voyage' },
  { value: 'creatif', label: 'Créatif' },
  { value: 'autre', label: 'Autre' },
];

export function LeisurePage({ month }: { month: string }) {
  const { state, add, update, remove } = useStore();
  const money = useMoney();
  const [sessionModal, setSessionModal] = useState<LeisureSession | 'new' | null>(null);
  const [activityModal, setActivityModal] = useState<LeisureActivity | 'new' | null>(null);
  const [wishModal, setWishModal] = useState<Wish | 'new' | null>(null);

  const m = leisureMonth(state, month);
  const byActivity = leisureByActivity(state, month);
  const best = byActivity[0];
  const sessions = m.sessions.slice().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label={`Temps loisirs · ${monthLabel(month, true)}`} value={formatDuration(m.minutes)} foot={`${m.count} séances`} />
        <StatTile label="Budget loisirs consommé" value={money(m.cost)} foot="coût des séances du mois" />
        <StatTile label="Plaisir moyen" value={m.rating ? `${m.rating.toFixed(1)}/5` : '—'} foot="note moyenne des séances" />
        <StatTile
          label="Activité dominante"
          value={best && best.minutes > 0 ? best.activity.name : '—'}
          foot={best && best.minutes > 0 ? formatDuration(best.minutes) : 'Aucune séance ce mois'}
          small
        />
      </div>

      <div className="grid grid-2">
        <Card
          title="Mes activités"
          subtitle="Temps passé face à l’objectif mensuel"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => setActivityModal('new')}>
              <Icon name="plus" size={13} />
              Activité
            </button>
          }
        >
          {byActivity.length ? (
            <div className="stack" style={{ gap: 14 }}>
              {byActivity.map(({ activity, minutes, cost, count }) => {
                const goal = activity.monthlyHoursGoal * 60;
                const pct = goal > 0 ? (minutes / goal) * 100 : 0;
                return (
                  <div key={activity.id}>
                    <div className="flex small" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{activity.name}</span>
                      <span className="chip">{KIND_OPTIONS.find((k) => k.value === activity.kind)?.label}</span>
                      <div className="spacer" />
                      <span className="tnum">
                        {formatDuration(minutes)}
                        {goal > 0 && <span className="muted"> / {activity.monthlyHoursGoal} h</span>}
                      </span>
                      <div className="row-actions" style={{ opacity: 1 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setActivityModal(activity)} aria-label="Modifier">
                          <Icon name="edit" size={13} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => remove('activities', activity.id)} aria-label="Supprimer">
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={slotColor(activity.slot)} />
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {count} séance{count > 1 ? 's' : ''} · {money(cost)} dépensés
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="sparkles" text="Ajoutez vos loisirs pour suivre le temps que vous leur consacrez." />
          )}
        </Card>

        <Card
          title="Envies & projets plaisir"
          subtitle="Ce que vous mettez de côté"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => setWishModal('new')}>
              <Icon name="plus" size={13} />
              Envie
            </button>
          }
        >
          {state.wishes.length ? (
            <div className="stack" style={{ gap: 14 }}>
              {state.wishes.map((w) => {
                const pct = w.price > 0 ? (w.saved / w.price) * 100 : 0;
                return (
                  <div key={w.id}>
                    <div className="flex small" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }} className={w.bought ? 'strike' : ''}>
                        {w.title}
                      </span>
                      <div className="spacer" />
                      <span className="tnum">
                        {money(w.saved)} <span className="muted">/ {money(w.price)}</span>
                      </span>
                      <div className="row-actions" style={{ opacity: 1 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => update('wishes', w.id, { saved: Math.min(w.price, w.saved + Math.max(10, Math.round(w.price * 0.1))) })}
                          title="Mettre de côté 10 % du prix"
                        >
                          +10 %
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => setWishModal(w)} aria-label="Modifier">
                          <Icon name="edit" size={13} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => remove('wishes', w.id)} aria-label="Supprimer">
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={w.bought ? 'var(--good)' : 'var(--s5)'} />
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {w.bought ? 'Obtenu 🎉' : `${pct.toFixed(0)} % financé`}
                      {w.target && !w.bought ? ` · visé pour ${formatDate(w.target, { withYear: true })}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="star" text="Notez vos envies : voyage, matériel, sortie… et suivez l’épargne dédiée." />
          )}
        </Card>
      </div>

      <Card
        title="Journal des séances"
        subtitle={monthLabel(month)}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setSessionModal('new')}>
            <Icon name="plus" size={14} />
            Enregistrer une séance
          </button>
        }
      >
        {sessions.length ? (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activité</th>
                  <th className="num">Durée</th>
                  <th className="num">Coût</th>
                  <th className="num">Plaisir</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="small muted tnum">{formatDate(s.date)}</td>
                    <td style={{ fontWeight: 550 }}>{state.activities.find((a) => a.id === s.activityId)?.name ?? '—'}</td>
                    <td className="num">{formatDuration(s.minutes)}</td>
                    <td className="num">{money(s.cost)}</td>
                    <td className="num">{'★'.repeat(s.rating)}</td>
                    <td className="small muted">{s.notes}</td>
                    <td className="num">
                      <div className="flex" style={{ gap: 2, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setSessionModal(s)} aria-label="Modifier">
                          <Icon name="edit" size={13} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => remove('sessions', s.id)} aria-label="Supprimer">
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="clock" text="Aucune séance enregistrée ce mois-ci." />
        )}
      </Card>

      {sessionModal && (
        <SessionModal
          initial={sessionModal === 'new' ? undefined : sessionModal}
          onClose={() => setSessionModal(null)}
          onSave={(s) => (sessionModal === 'new' ? add('sessions', s) : update('sessions', s.id, s))}
        />
      )}
      {activityModal && (
        <ActivityModal
          initial={activityModal === 'new' ? undefined : activityModal}
          onClose={() => setActivityModal(null)}
          onSave={(a) => (activityModal === 'new' ? add('activities', a) : update('activities', a.id, a))}
        />
      )}
      {wishModal && (
        <WishModal
          initial={wishModal === 'new' ? undefined : wishModal}
          onClose={() => setWishModal(null)}
          onSave={(w) => (wishModal === 'new' ? add('wishes', w) : update('wishes', w.id, w))}
        />
      )}
    </>
  );
}

function SessionModal({ initial, onClose, onSave }: { initial?: LeisureSession; onClose: () => void; onSave: (s: LeisureSession) => void }) {
  const { state } = useStore();
  const [activityId, setActivityId] = useState(initial?.activityId ?? state.activities[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? today());
  const [minutes, setMinutes] = useState(initial?.minutes ?? 60);
  const [cost, setCost] = useState(initial?.cost ?? 0);
  const [rating, setRating] = useState(initial?.rating ?? 4);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <Modal
      title={initial ? 'Modifier la séance' : 'Nouvelle séance'}
      onClose={onClose}
      onSubmit={() => {
        if (!activityId) return;
        onSave({ id: initial?.id ?? uid('se'), activityId, date, minutes, cost, rating, notes: notes.trim() || undefined });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Activité" full>
          <Select value={activityId} onChange={setActivityId} options={state.activities.map((a) => ({ value: a.id, label: a.name }))} />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={setDate} required />
        </Field>
        <Field label="Durée (minutes)">
          <NumberInput value={minutes} onChange={setMinutes} step="5" min="0" />
        </Field>
        <Field label="Coût">
          <NumberInput value={cost} onChange={setCost} min="0" />
        </Field>
        <Field label="Plaisir (1-5)">
          <NumberInput value={rating} onChange={(v) => setRating(Math.max(1, Math.min(5, Math.round(v))))} step="1" min="1" />
        </Field>
        <Field label="Notes" full>
          <TextArea value={notes} onChange={setNotes} />
        </Field>
      </div>
    </Modal>
  );
}

function ActivityModal({ initial, onClose, onSave }: { initial?: LeisureActivity; onClose: () => void; onSave: (a: LeisureActivity) => void }) {
  const { state } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<LeisureActivity['kind']>(initial?.kind ?? 'sport');
  const [goal, setGoal] = useState(initial?.monthlyHoursGoal ?? 8);

  return (
    <Modal
      title={initial ? 'Modifier l’activité' : 'Nouvelle activité'}
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return;
        onSave({
          id: initial?.id ?? uid('ac'),
          name: name.trim(),
          kind,
          monthlyHoursGoal: goal,
          slot: initial?.slot ?? ((state.activities.length % 8) + 1),
        });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Nom" full>
          <TextInput value={name} onChange={setName} placeholder="Escalade, piano, jeux vidéo…" required />
        </Field>
        <Field label="Type">
          <Select value={kind} onChange={setKind} options={KIND_OPTIONS} />
        </Field>
        <Field label="Objectif (heures / mois)">
          <NumberInput value={goal} onChange={setGoal} step="1" min="0" />
        </Field>
      </div>
    </Modal>
  );
}

function WishModal({ initial, onClose, onSave }: { initial?: Wish; onClose: () => void; onSave: (w: Wish) => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [saved, setSaved] = useState(initial?.saved ?? 0);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'normale');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [bought, setBought] = useState(initial?.bought ?? false);

  return (
    <Modal
      title={initial ? 'Modifier l’envie' : 'Nouvelle envie'}
      onClose={onClose}
      onSubmit={() => {
        if (!title.trim()) return;
        onSave({
          id: initial?.id ?? uid('wi'),
          title: title.trim(),
          price,
          saved,
          priority,
          target: target || undefined,
          bought,
        });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Envie" full>
          <TextInput value={title} onChange={setTitle} placeholder="Week-end, matériel, concert…" required />
        </Field>
        <Field label="Prix">
          <NumberInput value={price} onChange={setPrice} min="0" />
        </Field>
        <Field label="Déjà mis de côté">
          <NumberInput value={saved} onChange={setSaved} min="0" />
        </Field>
        <Field label="Priorité">
          <Select
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'haute', label: 'Haute' },
              { value: 'normale', label: 'Normale' },
              { value: 'basse', label: 'Basse' },
            ]}
          />
        </Field>
        <Field label="Date visée">
          <TextInput type="date" value={target} onChange={setTarget} />
        </Field>
        <Field label="Statut" full>
          <Select
            value={bought ? 'oui' : 'non'}
            onChange={(v) => setBought(v === 'oui')}
            options={[
              { value: 'non', label: 'En cours de financement' },
              { value: 'oui', label: 'Obtenu' },
            ]}
          />
        </Field>
      </div>
    </Modal>
  );
}
