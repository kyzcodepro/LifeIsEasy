import { useMemo, useState } from 'react';
import { Card, EmptyState, StatTile } from '../components/ui/Card';
import { ShowMore, useRowLimit } from '../components/ui/ShowMore';
import { Icon } from '../components/ui/Icon';
import { TransactionModal } from '../components/forms/TransactionModal';
import { HBarList } from '../components/charts/HBarList';
import { LineChart } from '../components/charts/LineChart';
import { slotColor } from '../components/charts/util';
import { useMoney, useStore } from '../store/store';
import {
  accountBalance, cashflow, expensesByCategory, incomeBySource, monthTotals, netWorth, txInMonth,
} from '../store/selectors';
import { formatDate, monthLabel } from '../lib/date';
import type { Transaction, TxKind } from '../types';

export function FinancePage({ month }: { month: string }) {
  const { state, remove } = useStore();
  const money = useMoney();
  const [kind, setKind] = useState<TxKind | 'tous'>('tous');
  const [accountId, setAccountId] = useState('tous');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);

  const totals = monthTotals(state, month);
  const flow = cashflow(state, 6, `${month}-15`);
  const cats = expensesByCategory(state, month);
  const incomes = incomeBySource(state, month);

  const rows = useMemo(
    () =>
      txInMonth(state, month)
        .filter((t) => (kind === 'tous' ? true : t.kind === kind))
        .filter((t) => (accountId === 'tous' ? true : t.accountId === accountId))
        .filter((t) => (query ? t.label.toLowerCase().includes(query.toLowerCase()) : true))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state, month, kind, accountId, query],
  );

  const rowLimit = useRowLimit(rows.length);

  const catName = (id: string) => state.categories.find((c) => c.id === id)?.name ?? '—';
  const accName = (id: string) => state.accounts.find((a) => a.id === id)?.name ?? '—';

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label="Patrimoine net" value={money(netWorth(state))} foot="tous comptes confondus" />
        <StatTile label={`Revenus · ${monthLabel(month, true)}`} value={money(totals.income)} foot={`${incomes.length} sources`} />
        <StatTile label={`Dépenses · ${monthLabel(month, true)}`} value={money(totals.expense)} foot={`${cats.length} catégories`} />
        <StatTile label="Solde du mois" value={money(totals.net)} foot={`Taux d’épargne ${totals.savingRate.toFixed(0)} %`} />
      </div>

      <div className="grid grid-2">
        <Card title="Évolution du solde mensuel" subtitle="Revenus − dépenses, 6 derniers mois">
          <LineChart
            labels={flow.map((f) => monthLabel(f.key, true))}
            series={[{ name: 'Solde net', color: 'var(--s1)', values: flow.map((f) => f.net), area: true }]}
            format={(v) => money(v, true)}
            zeroLine
            height={210}
          />
        </Card>

        <Card title="Mes comptes" subtitle="Soldes calculés à partir de toutes les opérations">
          <div className="list">
            {state.accounts.map((a) => (
              <div className="row" key={a.id}>
                <span style={{ color: 'var(--s1)' }}>
                  <Icon name="wallet" size={16} />
                </span>
                <div className="row-main">
                  <div className="row-title">{a.name}</div>
                  <div className="row-sub">
                    <span>{a.type}</span>
                    <span>Solde initial {money(a.initialBalance)}</span>
                  </div>
                </div>
                <span className="row-value">{money(accountBalance(state, a.id))}</span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            Les comptes se gèrent dans les <strong>Réglages</strong>.
          </p>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="Dépenses par catégorie" subtitle={monthLabel(month)}>
          <HBarList
            items={cats.map((c) => ({
              label: c.name,
              value: c.value,
              color: slotColor(c.slot),
              sub: `${totals.expense ? ((c.value / totals.expense) * 100).toFixed(0) : 0} % des dépenses`,
            }))}
            format={(v) => money(v)}
          />
        </Card>
        <Card title="Revenus par source" subtitle={monthLabel(month)}>
          <HBarList
            items={incomes.map((c) => ({
              label: c.name,
              value: c.value,
              color: slotColor(c.slot),
              sub: `${totals.income ? ((c.value / totals.income) * 100).toFixed(0) : 0} % des revenus`,
            }))}
            format={(v) => money(v)}
          />
        </Card>
      </div>

      <Card
        title="Opérations du mois"
        subtitle={`${rows.length} opération${rows.length > 1 ? 's' : ''}`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            Ajouter
          </button>
        }
      >
        <div className="flex flex-wrap" style={{ marginBottom: 12, gap: 8 }}>
          <div className="segmented">
            <button aria-pressed={kind === 'tous'} onClick={() => setKind('tous')}>
              Tout
            </button>
            <button aria-pressed={kind === 'depense'} onClick={() => setKind('depense')}>
              Dépenses
            </button>
            <button aria-pressed={kind === 'revenu'} onClick={() => setKind('revenu')}>
              Revenus
            </button>
          </div>
          <select className="select" style={{ width: 'auto' }} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="tous">Tous les comptes</option>
            {state.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input className="input" style={{ width: 'auto', flex: '1 1 160px' }} placeholder="Rechercher un libellé…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {rows.length ? (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th>Catégorie</th>
                  <th>Compte</th>
                  <th className="num">Montant</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, rowLimit.limit).map((t) => (
                  <tr key={t.id}>
                    <td className="muted small tnum">{formatDate(t.date)}</td>
                    <td>
                      <div style={{ fontWeight: 550 }}>{t.label}</div>
                      {t.businessId && (
                        <div className="small muted">{state.businesses.find((b) => b.id === t.businessId)?.name}</div>
                      )}
                    </td>
                    <td className="small">{catName(t.categoryId)}</td>
                    <td className="small muted">{accName(t.accountId)}</td>
                    <td className={`num ${t.kind === 'revenu' ? 'amount-in' : ''}`} style={{ fontWeight: 620 }}>
                      {t.kind === 'revenu' ? '+' : '−'} {money(t.amount)}
                    </td>
                    <td className="num">
                      <div className="flex" style={{ gap: 2, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setEditing(t)} aria-label="Modifier">
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => remove('transactions', t.id)} aria-label="Supprimer">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ShowMore
              hidden={rowLimit.hidden}
              expanded={rowLimit.expanded}
              total={rows.length}
              noun="opérations"
              onShowAll={rowLimit.showAll}
              onCollapse={rowLimit.collapse}
            />
          </div>
        ) : (
          <EmptyState icon="wallet" text="Aucune opération sur ce mois avec ces filtres." />
        )}
      </Card>

      {creating && <TransactionModal onClose={() => setCreating(false)} />}
      {editing && <TransactionModal initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
