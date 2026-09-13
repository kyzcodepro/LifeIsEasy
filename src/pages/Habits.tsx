import { useState } from 'react';
import { Card, EmptyState, ProgressBar, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Field, NumberInput, Select, TextInput } from '../components/ui/Field';
import { Heatmap } from '../components/charts/Heatmap';
import { useStore } from '../store/store';
import { habitDone, habitStats, habitsCompletion } from '../store/selectors';
import { DAY_SHORT, addDays, isoWeekDays, startOfWeek, today } from '../lib/date';
import { uid } from '../lib/id';
import { DOMAIN_META, DOMAIN_OPTIONS, domainColor } from '../lib/domains';
import type { Domain, Habit } from '../types';

export function HabitsPage() {
  const { state, add, update, remove, toggleHabit } = useStore();
  const now = today();
  const [modal, setModal] = useState<Habit | 'new' | null>(null);
  const [focus, setFocus] = useState<string>('all');

  const habits = state.habits.filter((h) => !h.archived);
  const week = isoWeekDays(startOfWeek(now));
  const completion7 = habitsCompletion(state, 7, now);
  const completion30 = habitsCompletion(state, 30, now);
  const bestStreak = habits.reduce((best, h) => Math.max(best, habitStats(state, h, now).streak), 0);
  const validationsMonth = Object.keys(state.habitLogs).filter((k) => k.split('|')[1]?.startsWith(now.slice(0, 7))).length;

  const dayRatio = (iso: string) => {
    const list = focus === 'all' ? habits : habits.filter((h) => h.id === focus);
    if (!list.length || iso > now) return 0;
    return list.filter((h) => habitDone(state, h.id, iso)).length / list.length;
  };

  const dayLabel = (iso: string) => {
    const list = focus === 'all' ? habits : habits.filter((h) => h.id === focus);
    const done = list.filter((h) => habitDone(state, h.id, iso));
    if (!done.length) return 'Rien de validé';
    return `${done.length}/${list.length} validées : ${done.map((h) => h.name).join(', ')}`;
  };

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label="Régularité (7 jours)" value={`${completion7.toFixed(0)} %`} foot="objectifs hebdo tenus" />
        <StatTile label="Régularité (30 jours)" value={`${completion30.toFixed(0)} %`} foot="tendance de fond" />
        <StatTile label="Meilleure série en cours" value={`${bestStreak} j`} foot="toutes habitudes confondues" />
        <StatTile label="Validations ce mois" value={String(validationsMonth)} foot="cases cochées" />
      </div>

      <Card
        title="Semaine en cours"
        subtitle="Cochez chaque jour tenu — le suivi se met à jour instantanément"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
            <Icon name="plus" size={14} />
            Nouvelle habitude
          </button>
        }
      >
        {habits.length ? (
          <div className="stack" style={{ gap: 16 }}>
            <div className="flex small muted" style={{ paddingLeft: 2 }}>
              <span style={{ width: 200 }} />
              <div className="habit-week">
                {DAY_SHORT.map((d) => (
                  <span key={d} style={{ width: 30, textAlign: 'center' }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
            {habits.map((h) => {
              const st = habitStats(state, h, now);
              return (
                <div key={h.id} className="flex flex-wrap" style={{ gap: 12 }}>
                  <div style={{ width: 200, minWidth: 140 }}>
                    <div className="flex" style={{ gap: 6 }}>
                      <span className="dot" style={{ width: 8, height: 8, borderRadius: 4, background: domainColor(h.domain) }} />
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{h.name}</span>
                    </div>
                    <div className="small muted">
                      {DOMAIN_META[h.domain].label} · objectif {h.weeklyTarget}×/sem.
                    </div>
                  </div>

                  <div className="habit-week">
                    {week.map((d) => {
                      const on = habitDone(state, h.id, d);
                      const future = d > now;
                      return (
                        <button
                          key={d}
                          className={`habit-day${on ? ' on' : ''}${future ? ' future' : ''}`}
                          disabled={future}
                          onClick={() => toggleHabit(h.id, d)}
                          aria-label={`${h.name} — ${d}`}
                          aria-pressed={on}
                          style={on ? { background: domainColor(h.domain), borderColor: domainColor(h.domain) } : undefined}
                        >
                          {Number(d.slice(-2))}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ flex: '1 1 160px', minWidth: 140 }}>
                    <div className="flex small" style={{ marginBottom: 4 }}>
                      <span className="tnum">
                        {st.weekCount}/{h.weeklyTarget}
                      </span>
                      <div className="spacer" />
                      {st.streak > 0 && (
                        <span className="small" style={{ color: 'var(--s2)' }}>
                          <Icon name="flame" size={12} /> {st.streak} j
                        </span>
                      )}
                      <span className="small muted">record {st.best} j</span>
                    </div>
                    <ProgressBar pct={st.weekPct} color={domainColor(h.domain)} />
                  </div>

                  <div className="row-actions" style={{ opacity: 1 }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => setModal(h)} aria-label="Modifier">
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => confirm(`Supprimer l’habitude « ${h.name} » et son historique ?`) && remove('habits', h.id)}
                      aria-label="Supprimer"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="flame"
            text="Aucune habitude suivie. Commencez par une seule, facile à tenir."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
                Créer une habitude
              </button>
            }
          />
        )}
      </Card>

      <Card
        title="Régularité sur 12 semaines"
        subtitle="Chaque case = un jour ; plus c’est foncé, plus vous avez tenu vos habitudes"
        actions={
          <select className="select" style={{ width: 'auto' }} value={focus} onChange={(e) => setFocus(e.target.value)}>
            <option value="all">Toutes les habitudes</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        }
      >
        <Heatmap endDate={now} weeks={12} valueFor={dayRatio} labelFor={dayLabel} />
        <p className="small muted" style={{ marginTop: 8 }}>
          Sur 84 jours : {Object.keys(state.habitLogs).filter((k) => {
            const d = k.split('|')[1];
            return d >= addDays(now, -83) && d <= now && (focus === 'all' || k.startsWith(`${focus}|`));
          }).length}{' '}
          validations enregistrées.
        </p>
      </Card>

      {modal && (
        <HabitModal
          initial={modal === 'new' ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={(h) => (modal === 'new' ? add('habits', h) : update('habits', h.id, h))}
        />
      )}
    </>
  );
}

function HabitModal({ initial, onClose, onSave }: { initial?: Habit; onClose: () => void; onSave: (h: Habit) => void }) {
  const { state } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [domain, setDomain] = useState<Domain>(initial?.domain ?? 'sante');
  const [weeklyTarget, setWeeklyTarget] = useState(initial?.weeklyTarget ?? 5);

  return (
    <Modal
      title={initial ? 'Modifier l’habitude' : 'Nouvelle habitude'}
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return;
        onSave({
          id: initial?.id ?? uid('hb'),
          name: name.trim(),
          domain,
          weeklyTarget: Math.max(1, Math.min(7, weeklyTarget)),
          slot: initial?.slot ?? ((state.habits.length % 8) + 1),
          archived: initial?.archived ?? false,
          createdAt: initial?.createdAt ?? today(),
        });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Habitude" full>
          <TextInput value={name} onChange={setName} placeholder="Sport, lecture, méditation…" required />
        </Field>
        <Field label="Domaine">
          <Select value={domain} onChange={setDomain} options={DOMAIN_OPTIONS} />
        </Field>
        <Field label="Objectif (jours / semaine)">
          <NumberInput value={weeklyTarget} onChange={setWeeklyTarget} step="1" min="1" />
        </Field>
      </div>
    </Modal>
  );
}
