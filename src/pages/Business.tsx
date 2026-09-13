import { useState } from 'react';
import { Card, EmptyState, ProgressBar, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Field, NumberInput, Select, TextArea, TextInput } from '../components/ui/Field';
import { BarChart } from '../components/charts/BarChart';
import { slotColor } from '../components/charts/util';
import { useMoney, useStore } from '../store/store';
import { businessMonthlySeries, businessStats, txInMonth } from '../store/selectors';
import { monthLabel, relativeDay, today } from '../lib/date';
import { uid } from '../lib/id';
import { BUSINESS_STATUS } from '../lib/domains';
import type { Business } from '../types';

export function BusinessPage({ month }: { month: string }) {
  const { state, add, update, remove } = useStore();
  const money = useMoney();
  const [editing, setEditing] = useState<Business | null>(null);
  const [creating, setCreating] = useState(false);
  const [milestoneFor, setMilestoneFor] = useState<string | null>(null);

  const monthTx = txInMonth(state, month).filter((t) => t.businessId);
  const revenue = monthTx.filter((t) => t.kind === 'revenu').reduce((s, t) => s + t.amount, 0);
  const charges = monthTx.filter((t) => t.kind === 'depense').reduce((s, t) => s + t.amount, 0);
  const goalTotal = state.businesses
    .filter((b) => b.status === 'actif' || b.status === 'lancement')
    .reduce((s, b) => s + b.monthlyGoal, 0);

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label={`CA business · ${monthLabel(month, true)}`} value={money(revenue)} foot={`${state.businesses.length} activités`} />
        <StatTile label="Charges" value={money(charges)} foot="dépenses rattachées à un business" />
        <StatTile label="Marge" value={money(revenue - charges)} foot={revenue ? `${(((revenue - charges) / revenue) * 100).toFixed(0)} % de marge` : '—'} />
        <StatTile
          label="Objectif global"
          value={goalTotal ? `${Math.round((revenue / goalTotal) * 100)} %` : '—'}
          foot={goalTotal ? `${money(revenue)} / ${money(goalTotal)}` : 'Aucun objectif défini'}
        />
      </div>

      <div className="flex">
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          <Icon name="plus" size={14} />
          Nouveau business
        </button>
      </div>

      {state.businesses.length ? (
        state.businesses.map((b) => {
          const st = businessStats(state, b.id, month);
          const series = businessMonthlySeries(state, b.id, 6, `${month}-15`);
          const ms = state.milestones.filter((m) => m.businessId === b.id);
          const tasks = state.tasks.filter((t) => t.businessId === b.id && !t.done);
          const status = BUSINESS_STATUS[b.status];
          return (
            <Card
              key={b.id}
              title={b.name}
              subtitle={b.description}
              actions={
                <>
                  <span className={`chip ${status.tone}`}>
                    <span className="dot" style={{ background: slotColor(b.slot) }} />
                    {status.label}
                  </span>
                  <button className="btn btn-ghost btn-icon" onClick={() => setEditing(b)} aria-label="Modifier">
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => confirm(`Supprimer « ${b.name} » ? Les opérations liées seront conservées.`) && remove('businesses', b.id)}
                    aria-label="Supprimer"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </>
              }
            >
              <div className="grid grid-2">
                <div className="stack">
                  <div className="grid grid-3" style={{ gap: 10 }}>
                    <StatTile label="CA du mois" value={money(st.revenue)} small />
                    <StatTile label="Charges" value={money(st.charges)} small />
                    <StatTile label="Marge" value={money(st.margin)} small />
                  </div>
                  <div>
                    <div className="flex small" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 550 }}>Objectif mensuel</span>
                      <div className="spacer" />
                      <span className="tnum">
                        {money(st.revenue)} <span className="muted">/ {money(st.goal)}</span>
                      </span>
                    </div>
                    <ProgressBar pct={st.goalPct} color={slotColor(b.slot)} height={10} />
                  </div>

                  <div>
                    <div className="flex" style={{ marginBottom: 6 }}>
                      <h3>Jalons</h3>
                      <div className="spacer" />
                      <button className="btn btn-ghost btn-sm" onClick={() => setMilestoneFor(b.id)}>
                        <Icon name="plus" size={13} />
                        Ajouter
                      </button>
                    </div>
                    {ms.length ? (
                      <div className="list">
                        {ms.map((m) => (
                          <div className="row" key={m.id}>
                            <button
                              className={`checkbox${m.done ? ' on' : ''}`}
                              onClick={() => update('milestones', m.id, { done: !m.done })}
                              aria-label={m.title}
                            >
                              <Icon name="check" size={12} />
                            </button>
                            <div className="row-main">
                              <div className={`row-title${m.done ? ' strike' : ''}`}>{m.title}</div>
                              {m.due && (
                                <div className="row-sub">
                                  <span style={!m.done && m.due < today() ? { color: 'var(--critical)' } : undefined}>
                                    {relativeDay(m.due)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="row-actions">
                              <button className="btn btn-ghost btn-icon" onClick={() => remove('milestones', m.id)} aria-label="Supprimer">
                                <Icon name="trash" size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="small muted">Aucun jalon. Découpez votre projet en étapes concrètes.</p>
                    )}
                    {tasks.length > 0 && (
                      <p className="small muted" style={{ marginTop: 8 }}>
                        {tasks.length} tâche{tasks.length > 1 ? 's' : ''} ouverte{tasks.length > 1 ? 's' : ''} rattachée
                        {tasks.length > 1 ? 's' : ''} à ce business.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 style={{ marginBottom: 8 }}>CA et charges · 6 mois</h3>
                  <BarChart
                    labels={series.map((s) => monthLabel(s.key, true))}
                    series={[
                      { name: 'CA', color: slotColor(b.slot), values: series.map((s) => s.revenue) },
                      { name: 'Charges', color: 'var(--s2)', values: series.map((s) => s.charges) },
                    ]}
                    format={(v) => money(v, true)}
                    tableHead="Mois"
                    height={200}
                  />
                </div>
              </div>
            </Card>
          );
        })
      ) : (
        <Card>
          <EmptyState
            icon="briefcase"
            text="Aucun business pour l’instant. Créez-en un pour suivre son CA, ses charges et ses objectifs."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
                Créer un business
              </button>
            }
          />
        </Card>
      )}

      {(creating || editing) && (
        <BusinessModal
          initial={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {milestoneFor && <MilestoneModal businessId={milestoneFor} onClose={() => setMilestoneFor(null)} />}
    </>
  );

  function MilestoneModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
    const [title, setTitle] = useState('');
    const [due, setDue] = useState('');
    return (
      <Modal
        title="Nouveau jalon"
        onClose={onClose}
        onSubmit={() => {
          if (!title.trim()) return;
          add('milestones', { id: uid('ms'), businessId, title: title.trim(), due: due || undefined, done: false });
          onClose();
        }}
      >
        <Field label="Intitulé">
          <TextInput value={title} onChange={setTitle} placeholder="Lancer la campagne, signer 3 clients…" required />
        </Field>
        <Field label="Échéance">
          <TextInput type="date" value={due} onChange={setDue} />
        </Field>
      </Modal>
    );
  }
}

function BusinessModal({ initial, onClose }: { initial?: Business; onClose: () => void }) {
  const { add, update, state } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [status, setStatus] = useState<Business['status']>(initial?.status ?? 'idee');
  const [monthlyGoal, setMonthlyGoal] = useState(initial?.monthlyGoal ?? 1000);
  const [startDate, setStartDate] = useState(initial?.startDate ?? today());
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <Modal
      title={initial ? 'Modifier le business' : 'Nouveau business'}
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return;
        const payload: Business = {
          id: initial?.id ?? uid('biz'),
          name: name.trim(),
          status,
          monthlyGoal,
          startDate,
          slot: initial?.slot ?? ((state.businesses.length % 8) + 1),
          description: description.trim() || undefined,
        };
        if (initial) update('businesses', initial.id, payload);
        else add('businesses', payload);
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Nom" full>
          <TextInput value={name} onChange={setName} placeholder="Boutique en ligne, agence, SaaS…" required />
        </Field>
        <Field label="Statut">
          <Select
            value={status}
            onChange={setStatus}
            options={Object.entries(BUSINESS_STATUS).map(([value, v]) => ({ value: value as Business['status'], label: v.label }))}
          />
        </Field>
        <Field label="Objectif de CA mensuel">
          <NumberInput value={monthlyGoal} onChange={setMonthlyGoal} step="50" min="0" />
        </Field>
        <Field label="Date de lancement" full>
          <TextInput type="date" value={startDate} onChange={setStartDate} />
        </Field>
        <Field label="Description" full>
          <TextArea value={description} onChange={setDescription} placeholder="En une phrase : ce que vend ce business et à qui." />
        </Field>
      </div>
    </Modal>
  );
}
