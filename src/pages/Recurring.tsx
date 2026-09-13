import { useState } from 'react';
import { Card, EmptyState, ProgressBar, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Field, NumberInput, Select, TextInput } from '../components/ui/Field';
import { slotColor } from '../components/charts/util';
import { useMoney, useStore } from '../store/store';
import { budgetLines, monthTotals } from '../store/selectors';
import { nextOccurrence } from '../store/recurring';
import { DAY_SHORT, monthLabel, relativeDay, today } from '../lib/date';
import { uid } from '../lib/id';
import type { Frequency, Recurring, TxKind } from '../types';

const FREQ_OPTIONS: Array<{ value: Frequency; label: string }> = [
  { value: 'hebdo', label: 'Chaque semaine' },
  { value: 'mensuel', label: 'Chaque mois' },
  { value: 'trimestriel', label: 'Chaque trimestre' },
  { value: 'annuel', label: 'Chaque année' },
];

/** Équivalent mensuel d'une récurrence, pour le calcul des charges fixes. */
function monthlyEquivalent(r: Recurring): number {
  switch (r.frequency) {
    case 'hebdo':
      return (r.amount * 52) / 12;
    case 'trimestriel':
      return r.amount / 3;
    case 'annuel':
      return r.amount / 12;
    default:
      return r.amount;
  }
}

export function RecurringPage({ month }: { month: string }) {
  const { state, add, update, remove } = useStore();
  const money = useMoney();
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [creating, setCreating] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<Record<string, number>>({});

  const budgets = budgetLines(state, month);
  const totals = monthTotals(state, month);
  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const fixedCharges = state.recurrings.filter((r) => r.active && r.kind === 'depense').reduce((s, r) => s + monthlyEquivalent(r), 0);
  const fixedIncome = state.recurrings.filter((r) => r.active && r.kind === 'revenu').reduce((s, r) => s + monthlyEquivalent(r), 0);

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label="Charges fixes / mois" value={money(fixedCharges)} foot={`${state.recurrings.filter((r) => r.active && r.kind === 'depense').length} prélèvements`} />
        <StatTile label="Revenus récurrents / mois" value={money(fixedIncome)} foot="salaire, abonnements clients…" />
        <StatTile label="Reste à vivre théorique" value={money(fixedIncome - fixedCharges)} foot="avant dépenses variables" />
        <StatTile
          label={`Budgets · ${monthLabel(month, true)}`}
          value={totalBudget ? `${Math.round((totalSpent / totalBudget) * 100)} %` : '—'}
          foot={totalBudget ? `${money(totalSpent)} / ${money(totalBudget)}` : 'Aucun budget défini'}
        />
      </div>

      <Card title="Budgets mensuels par catégorie" subtitle={`Dépenses réelles de ${monthLabel(month)} face à vos limites`}>
        {state.categories.filter((c) => c.kind === 'depense').length ? (
          <div className="stack" style={{ gap: 14 }}>
            {state.categories
              .filter((c) => c.kind === 'depense')
              .map((c) => {
                const line = budgets.find((b) => b.id === c.id);
                const spent = line?.spent ?? state.transactions
                  .filter((t) => t.categoryId === c.id && t.date.startsWith(month) && t.kind === 'depense')
                  .reduce((s, t) => s + t.amount, 0);
                const pct = c.budget > 0 ? (spent / c.budget) * 100 : 0;
                const draft = budgetDraft[c.id] ?? c.budget;
                return (
                  <div key={c.id}>
                    <div className="flex flex-wrap" style={{ marginBottom: 5, gap: 8 }}>
                      <span className="small" style={{ fontWeight: 600 }}>
                        {c.name}
                      </span>
                      <div className="spacer" />
                      <span className="small tnum">{money(spent)} dépensés</span>
                      <input
                        className="input tnum"
                        type="number"
                        min="0"
                        step="10"
                        style={{ width: 110 }}
                        value={draft}
                        aria-label={`Budget ${c.name}`}
                        onChange={(e) => setBudgetDraft({ ...budgetDraft, [c.id]: Number(e.target.value) })}
                        onBlur={() => update('categories', c.id, { budget: draft })}
                      />
                    </div>
                    <ProgressBar
                      pct={pct}
                      color={pct > 100 ? 'var(--critical)' : pct > 85 ? 'var(--warning)' : slotColor(c.slot)}
                    />
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {c.budget > 0
                        ? pct > 100
                          ? `Dépassement de ${money(spent - c.budget)}`
                          : `Il reste ${money(c.budget - spent)} · ${pct.toFixed(0)} % consommé`
                        : 'Pas de budget défini pour cette catégorie'}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyState icon="wallet" text="Créez des catégories de dépenses dans les Réglages." />
        )}
        <p className="small muted" style={{ marginTop: 12 }}>
          Total dépensé ce mois : <strong>{money(totals.expense)}</strong> — dont {money(totalSpent)} sur des catégories
          budgétées.
        </p>
      </Card>

      <Card
        title="Opérations récurrentes"
        subtitle="Générées automatiquement à chaque échéance"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            Ajouter
          </button>
        }
      >
        {state.recurrings.length ? (
          <div className="list">
            {state.recurrings.map((r) => {
              const next = nextOccurrence(r);
              return (
                <div className="row" key={r.id}>
                  <span style={{ color: r.kind === 'revenu' ? 'var(--good)' : 'var(--s2)' }}>
                    <Icon name="repeat" size={16} />
                  </span>
                  <div className="row-main">
                    <div className="row-title">{r.label}</div>
                    <div className="row-sub">
                      <span>{FREQ_OPTIONS.find((f) => f.value === r.frequency)?.label}</span>
                      <span>
                        {r.frequency === 'hebdo' ? DAY_SHORT[r.anchor % 7] : `le ${r.anchor}`}
                      </span>
                      <span>{state.categories.find((c) => c.id === r.categoryId)?.name}</span>
                      {r.active && next && <span>Prochaine : {relativeDay(next)}</span>}
                      {!r.active && <span style={{ color: 'var(--ink-muted)' }}>Inactif</span>}
                    </div>
                  </div>
                  <span className={`row-value ${r.kind === 'revenu' ? 'amount-in' : ''}`}>
                    {r.kind === 'revenu' ? '+' : '−'} {money(r.amount)}
                  </span>
                  <div className="row-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => update('recurrings', r.id, { active: !r.active })}
                    >
                      {r.active ? 'Suspendre' : 'Activer'}
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => setEditing(r)} aria-label="Modifier">
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => remove('recurrings', r.id)} aria-label="Supprimer">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="repeat" text="Ajoutez vos loyers, abonnements et salaires : ils seront saisis pour vous." />
        )}
      </Card>

      {(creating || editing) && (
        <RecurringModal
          initial={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(payload) => {
            if (editing) update('recurrings', editing.id, payload);
            else add('recurrings', payload);
          }}
        />
      )}
    </>
  );
}

function RecurringModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Recurring;
  onClose: () => void;
  onSave: (r: Recurring) => void;
}) {
  const { state } = useStore();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [kind, setKind] = useState<TxKind>(initial?.kind ?? 'depense');
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'mensuel');
  const [anchor, setAnchor] = useState(initial?.anchor ?? 1);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? state.categories.find((c) => c.kind === 'depense')?.id ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? state.accounts[0]?.id ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? today());
  const cats = state.categories.filter((c) => c.kind === kind);

  return (
    <Modal
      title={initial ? 'Modifier la récurrence' : 'Nouvelle récurrence'}
      onClose={onClose}
      onSubmit={() => {
        if (!label.trim() || amount <= 0) return;
        onSave({
          id: initial?.id ?? uid('rec'),
          label: label.trim(),
          amount,
          kind,
          categoryId,
          accountId,
          frequency,
          anchor,
          startDate,
          active: initial?.active ?? true,
          lastRun: initial?.lastRun,
          businessId: initial?.businessId,
        });
        onClose();
      }}
    >
      <div className="segmented" style={{ alignSelf: 'flex-start' }}>
        <button
          type="button"
          aria-pressed={kind === 'depense'}
          onClick={() => {
            setKind('depense');
            setCategoryId(state.categories.find((c) => c.kind === 'depense')?.id ?? '');
          }}
        >
          Dépense
        </button>
        <button
          type="button"
          aria-pressed={kind === 'revenu'}
          onClick={() => {
            setKind('revenu');
            setCategoryId(state.categories.find((c) => c.kind === 'revenu')?.id ?? '');
          }}
        >
          Revenu
        </button>
      </div>
      <div className="form-grid">
        <Field label="Libellé" full>
          <TextInput value={label} onChange={setLabel} placeholder="Loyer, Netflix, salaire…" required />
        </Field>
        <Field label="Montant">
          <NumberInput value={amount} onChange={setAmount} min="0" required />
        </Field>
        <Field label="Fréquence">
          <Select value={frequency} onChange={setFrequency} options={FREQ_OPTIONS} />
        </Field>
        <Field label={frequency === 'hebdo' ? 'Jour de la semaine' : 'Jour du mois'}>
          {frequency === 'hebdo' ? (
            <Select
              value={String(anchor)}
              onChange={(v) => setAnchor(Number(v))}
              options={DAY_SHORT.map((d, i) => ({ value: String(i), label: d }))}
            />
          ) : (
            <NumberInput value={anchor} onChange={setAnchor} step="1" min="1" />
          )}
        </Field>
        <Field label="Début">
          <TextInput type="date" value={startDate} onChange={setStartDate} />
        </Field>
        <Field label="Catégorie">
          <Select value={categoryId} onChange={setCategoryId} options={cats.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Compte" full>
          <Select value={accountId} onChange={setAccountId} options={state.accounts.map((a) => ({ value: a.id, label: a.name }))} />
        </Field>
      </div>
    </Modal>
  );
}
