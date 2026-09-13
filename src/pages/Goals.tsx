import { useState } from 'react';
import { Card, EmptyState, ProgressBar, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Field, NumberInput, Select, TextArea, TextInput } from '../components/ui/Field';
import { useStore } from '../store/store';
import { goalProgress } from '../store/selectors';
import { formatDate, today } from '../lib/date';
import { uid } from '../lib/id';
import { DOMAIN_META, DOMAIN_OPTIONS, domainColor } from '../lib/domains';
import type { Domain, Goal } from '../types';

const SOURCE_OPTIONS: Array<{ value: Goal['source']; label: string }> = [
  { value: 'manuel', label: 'Manuel (je mets à jour moi-même)' },
  { value: 'epargne', label: 'Automatique : solde de l’épargne' },
  { value: 'business', label: 'Automatique : CA d’un business' },
  { value: 'habitude', label: 'Automatique : habitude de la semaine' },
];

export function GoalsPage() {
  const { state, add, update, remove } = useStore();
  const now = today();
  const [modal, setModal] = useState<Goal | 'new' | null>(null);
  const [filter, setFilter] = useState<Domain | 'tous'>('tous');

  const goals = state.goals.filter((g) => (filter === 'tous' ? true : g.domain === filter));
  const active = state.goals.filter((g) => !g.done);
  const avg = active.length ? active.reduce((s, g) => s + goalProgress(state, g, now).pct, 0) / active.length : 0;
  const late = active.filter((g) => g.deadline && g.deadline < now).length;

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label="Objectifs actifs" value={String(active.length)} foot={`${state.goals.length - active.length} atteints`} />
        <StatTile label="Progression moyenne" value={`${avg.toFixed(0)} %`} foot="sur les objectifs en cours" />
        <StatTile label="Échéances dépassées" value={String(late)} foot="à revoir ou replanifier" />
        <StatTile
          label="Prochaine échéance"
          value={
            active.filter((g) => g.deadline && g.deadline >= now).sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))[0]?.deadline
              ? formatDate(
                  active.filter((g) => g.deadline && g.deadline >= now).sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))[0].deadline!,
                  { withYear: true },
                )
              : '—'
          }
          small
          foot="objectif le plus proche"
        />
      </div>

      <div className="flex flex-wrap">
        <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value as Domain | 'tous')}>
          <option value="tous">Tous les domaines</option>
          {DOMAIN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
          <Icon name="plus" size={14} />
          Nouvel objectif
        </button>
      </div>

      {goals.length ? (
        <div className="grid grid-2">
          {goals.map((g) => {
            const p = goalProgress(state, g, now);
            const color = domainColor(g.domain);
            return (
              <Card key={g.id}>
                <div className="flex" style={{ marginBottom: 8 }}>
                  <span className="pill-domain" style={{ color }}>
                    {DOMAIN_META[g.domain].label}
                  </span>
                  {g.source !== 'manuel' && (
                    <span className="chip">
                      <Icon name="repeat" size={11} />
                      auto
                    </span>
                  )}
                  <div className="spacer" />
                  <div className="row-actions" style={{ opacity: 1 }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => setModal(g)} aria-label="Modifier">
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => remove('goals', g.id)} aria-label="Supprimer">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                <h2 style={{ marginBottom: 6 }} className={g.done ? 'strike' : ''}>
                  {g.title}
                </h2>

                <div className="flex small" style={{ marginBottom: 5 }}>
                  <span className="tnum" style={{ fontWeight: 620, fontSize: 16 }}>
                    {p.current.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="muted">
                    / {g.target.toLocaleString('fr-FR')} {g.unit}
                  </span>
                  <div className="spacer" />
                  <span className="tnum" style={{ fontWeight: 620 }}>
                    {p.pct.toFixed(0)} %
                  </span>
                </div>
                <ProgressBar pct={p.pct} color={g.done ? 'var(--good)' : color} height={10} />

                <div className="flex small muted" style={{ marginTop: 8 }}>
                  <span>{g.deadline ? `${formatDate(g.deadline, { withYear: true })} · ${p.label}` : 'Sans échéance'}</span>
                  <div className="spacer" />
                  {g.source === 'manuel' && !g.done && (
                    <div className="flex" style={{ gap: 4 }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => update('goals', g.id, { current: Math.max(0, g.current - Math.max(1, g.target * 0.05)) })}
                      >
                        −
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => update('goals', g.id, { current: Math.min(g.target, g.current + Math.max(1, g.target * 0.05)) })}
                      >
                        +
                      </button>
                    </div>
                  )}
                  <button className="btn btn-sm" onClick={() => update('goals', g.id, { done: !g.done })}>
                    {g.done ? 'Rouvrir' : 'Atteint'}
                  </button>
                </div>

                {g.notes && (
                  <p className="small muted" style={{ marginTop: 8 }}>
                    {g.notes}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon="target"
            text="Aucun objectif. Fixez-en un : épargne, CA, sport, lecture…"
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
                Créer un objectif
              </button>
            }
          />
        </Card>
      )}

      {modal && (
        <GoalModal
          initial={modal === 'new' ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={(g) => (modal === 'new' ? add('goals', g) : update('goals', g.id, g))}
        />
      )}
    </>
  );
}

function GoalModal({ initial, onClose, onSave }: { initial?: Goal; onClose: () => void; onSave: (g: Goal) => void }) {
  const { state } = useStore();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [domain, setDomain] = useState<Domain>(initial?.domain ?? 'perso');
  const [target, setTarget] = useState(initial?.target ?? 100);
  const [current, setCurrent] = useState(initial?.current ?? 0);
  const [unit, setUnit] = useState(initial?.unit ?? '€');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [source, setSource] = useState<Goal['source']>(initial?.source ?? 'manuel');
  const [sourceRef, setSourceRef] = useState(initial?.sourceRef ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const refOptions =
    source === 'business'
      ? state.businesses.map((b) => ({ value: b.id, label: b.name }))
      : source === 'habitude'
        ? state.habits.map((h) => ({ value: h.id, label: h.name }))
        : [];

  return (
    <Modal
      title={initial ? 'Modifier l’objectif' : 'Nouvel objectif'}
      onClose={onClose}
      onSubmit={() => {
        if (!title.trim() || target <= 0) return;
        onSave({
          id: initial?.id ?? uid('go'),
          title: title.trim(),
          domain,
          target,
          current,
          unit,
          deadline: deadline || undefined,
          source,
          sourceRef: refOptions.length ? sourceRef || refOptions[0].value : undefined,
          notes: notes.trim() || undefined,
          done: initial?.done ?? false,
        });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Objectif" full>
          <TextInput value={title} onChange={setTitle} placeholder="Épargner 10 000 €, courir un semi…" required />
        </Field>
        <Field label="Domaine">
          <Select value={domain} onChange={setDomain} options={DOMAIN_OPTIONS} />
        </Field>
        <Field label="Échéance">
          <TextInput type="date" value={deadline} onChange={setDeadline} />
        </Field>
        <Field label="Valeur cible">
          <NumberInput value={target} onChange={setTarget} min="0" />
        </Field>
        <Field label="Unité">
          <TextInput value={unit} onChange={setUnit} placeholder="€, km, livres…" />
        </Field>
        <Field label="Suivi" full>
          <Select value={source} onChange={setSource} options={SOURCE_OPTIONS} />
        </Field>
        {refOptions.length > 0 && (
          <Field label="Élément suivi" full>
            <Select value={sourceRef || refOptions[0].value} onChange={setSourceRef} options={refOptions} />
          </Field>
        )}
        {source === 'manuel' && (
          <Field label="Valeur actuelle">
            <NumberInput value={current} onChange={setCurrent} min="0" />
          </Field>
        )}
        <Field label="Notes" full>
          <TextArea value={notes} onChange={setNotes} placeholder="Pourquoi cet objectif compte, comment l’atteindre…" />
        </Field>
      </div>
    </Modal>
  );
}
