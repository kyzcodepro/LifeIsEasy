import { useMemo } from 'react';
import { Card, StatTile } from '../components/ui/Card';
import { BarChart } from '../components/charts/BarChart';
import { LineChart } from '../components/charts/LineChart';
import { HBarList } from '../components/charts/HBarList';
import { slotColor } from '../components/charts/util';
import { useMoney, useStore } from '../store/store';
import {
  budgetLines, businessStats, cashflow, expensesByCategory, habitsCompletion,
  leisureMonth, lifeScore, monthRange, monthTotals, monthTotalsUpTo, plannedMinutesByDomain,
} from '../store/selectors';
import { addDays, addMonths, formatDuration, fromISO, monthKey, monthLabel, startOfWeek, startOfMonth, today } from '../lib/date';
import { DOMAIN_META, domainColor } from '../lib/domains';
import type { Domain } from '../types';

export function StatsPage({ month }: { month: string }) {
  const { state } = useStore();
  const money = useMoney();
  const now = today();

  const flow = cashflow(state, 12, `${month}-15`);
  const totals = monthTotals(state, month);
  const score = lifeScore(state, now);
  const { from, to } = monthRange(month);

  // Temps : événements planifiés + séances de loisir, par domaine
  const timeByDomain = useMemo(() => {
    const planned = plannedMinutesByDomain(state, from, to);
    const leisureMin = leisureMonth(state, month).minutes;
    const merged: Record<string, number> = { ...planned };
    merged.loisir = (merged.loisir ?? 0) + leisureMin;
    return (Object.entries(merged) as Array<[Domain, number]>)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [state, from, to, month]);
  const totalMinutes = timeByDomain.reduce((s, [, v]) => s + v, 0);

  // Régularité des habitudes, 10 dernières semaines
  const habitTrend = useMemo(() => {
    const weeks: Array<{ label: string; value: number }> = [];
    for (let i = 9; i >= 0; i--) {
      const end = addDays(startOfWeek(now), -i * 7 + 6);
      const ref = end > now ? now : end;
      weeks.push({ label: `S-${i}`, value: habitsCompletion(state, 7, ref) });
    }
    return weeks;
  }, [state, now]);

  // Tâches terminées par semaine
  const taskTrend = useMemo(() => {
    const weeks: Array<{ label: string; value: number }> = [];
    for (let i = 9; i >= 0; i--) {
      const start = addDays(startOfWeek(now), -i * 7);
      const end = addDays(start, 6);
      weeks.push({
        label: `S-${i}`,
        value: state.tasks.filter((t) => t.done && t.doneAt && t.doneAt >= start && t.doneAt <= end).length,
      });
    }
    return weeks;
  }, [state, now]);

  const cats = expensesByCategory(state, month);
  const budgets = budgetLines(state, month);
  const overBudget = budgets.filter((b) => b.pct > 100);
  const savingsTrend = flow.map((f) => (f.income > 0 ? (f.net / f.income) * 100 : 0));

  const businessRows = state.businesses.map((b) => ({
    business: b,
    stats: businessStats(state, b.id, month),
  }));

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label="Score de vie" value={`${score.total}/100`} foot="moyenne des 5 domaines" />
        <StatTile label="Taux d’épargne" value={`${totals.savingRate.toFixed(0)} %`} foot={monthLabel(month)} />
        <StatTile label="Temps tracké" value={formatDuration(totalMinutes)} foot="agenda + séances loisirs" />
        <StatTile label="Budgets dépassés" value={String(overBudget.length)} foot={`sur ${budgets.length} budgets suivis`} />
      </div>

      <Card title="Équilibre de vie" subtitle="Score par domaine, calculé à partir de toutes vos données">
        <div className="grid grid-kpi" style={{ gap: 10 }}>
          {score.parts.map((p) => (
            <div key={p.label}>
              <div className="flex small" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 550 }}>{p.label}</span>
                <div className="spacer" />
                <span className="tnum">{p.value}</span>
              </div>
              <div className="progress">
                <span
                  style={{
                    width: `${p.value}%`,
                    background: p.value >= 70 ? 'var(--good)' : p.value >= 40 ? 'var(--warning)' : 'var(--critical)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Finances = taux d’épargne et budgets tenus · Productivité = tâches en retard · Santé = régularité des habitudes ·
          Business = atteinte des objectifs de CA · Loisirs = heures face aux objectifs.
        </p>
      </Card>

      <div className="grid grid-2">
        <Card title="Revenus et dépenses" subtitle="12 derniers mois">
          <BarChart
            labels={flow.map((f) => monthLabel(f.key, true))}
            series={[
              { name: 'Revenus', color: 'var(--s3)', values: flow.map((f) => f.income) },
              { name: 'Dépenses', color: 'var(--s2)', values: flow.map((f) => f.expense) },
            ]}
            format={(v) => money(v, true)}
            tableHead="Mois"
            height={230}
          />
        </Card>

        <Card title="Taux d’épargne" subtitle="Part du revenu conservée chaque mois">
          <LineChart
            labels={flow.map((f) => monthLabel(f.key, true))}
            series={[{ name: 'Taux d’épargne', color: 'var(--s1)', values: savingsTrend, area: true }]}
            format={(v) => `${v.toFixed(0)} %`}
            zeroLine
            height={230}
          />
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="Où part votre temps" subtitle={`${monthLabel(month)} · agenda et loisirs cumulés`}>
          <HBarList
            items={timeByDomain.map(([d, mins]) => ({
              label: DOMAIN_META[d].label,
              value: mins,
              color: domainColor(d),
              sub: `${totalMinutes ? ((mins / totalMinutes) * 100).toFixed(0) : 0} % du temps tracké`,
            }))}
            format={(v) => formatDuration(v)}
          />
        </Card>

        <Card title="Où part votre argent" subtitle={`${monthLabel(month)} · toutes catégories`}>
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
      </div>

      <div className="grid grid-2">
        <Card title="Régularité des habitudes" subtitle="10 dernières semaines">
          <LineChart
            labels={habitTrend.map((h) => h.label)}
            series={[{ name: 'Objectifs hebdo tenus', color: 'var(--s3)', values: habitTrend.map((h) => h.value), area: true }]}
            format={(v) => `${v.toFixed(0)} %`}
            height={210}
          />
        </Card>

        <Card title="Tâches terminées" subtitle="Par semaine, 10 dernières semaines">
          <BarChart
            labels={taskTrend.map((t) => t.label)}
            series={[{ name: 'Tâches terminées', color: 'var(--s1)', values: taskTrend.map((t) => t.value) }]}
            format={(v) => String(Math.round(v))}
            tableHead="Semaine"
            height={210}
          />
        </Card>
      </div>

      <Card title="Performance des business" subtitle={monthLabel(month)}>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Business</th>
                <th className="num">CA</th>
                <th className="num">Charges</th>
                <th className="num">Marge</th>
                <th className="num">Objectif</th>
                <th className="num">Atteinte</th>
              </tr>
            </thead>
            <tbody>
              {businessRows.map(({ business, stats }) => (
                <tr key={business.id}>
                  <td>
                    <span className="flex" style={{ gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: slotColor(business.slot) }} />
                      <span style={{ fontWeight: 550 }}>{business.name}</span>
                    </span>
                  </td>
                  <td className="num">{money(stats.revenue)}</td>
                  <td className="num">{money(stats.charges)}</td>
                  <td className="num" style={{ color: stats.margin >= 0 ? 'var(--good-text)' : 'var(--critical)' }}>
                    {money(stats.margin)}
                  </td>
                  <td className="num muted">{money(stats.goal)}</td>
                  <td className="num" style={{ fontWeight: 620 }}>
                    {stats.goal ? `${stats.goalPct.toFixed(0)} %` : '—'}
                  </td>
                </tr>
              ))}
              {!businessRows.length && (
                <tr>
                  <td colSpan={6} className="muted small">
                    Aucun business enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Comparaison mensuelle"
        subtitle={
          month === monthKey(now)
            ? 'Mois en cours face au mois précédent, à période comparable (mêmes jours écoulés)'
            : 'Mois sélectionné face au mois précédent'
        }
      >
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Indicateur</th>
                <th className="num">{monthLabel(monthKey(addMonths(startOfMonth(`${month}-01`), -1)), true)}</th>
                <th className="num">{monthLabel(month, true)}</th>
                <th className="num">Écart</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const prevKey = monthKey(addMonths(startOfMonth(`${month}-01`), -1));
                const prev =
                  month === monthKey(now)
                    ? monthTotalsUpTo(state, prevKey, fromISO(now).getDate())
                    : monthTotals(state, prevKey);
                const prevLeisure = leisureMonth(state, prevKey);
                const curLeisure = leisureMonth(state, month);
                const rows: Array<[string, number, number, (v: number) => string]> = [
                  ['Revenus', prev.income, totals.income, (v) => money(v)],
                  ['Dépenses', prev.expense, totals.expense, (v) => money(v)],
                  ['Solde', prev.net, totals.net, (v) => money(v)],
                  ['Heures de loisirs', prevLeisure.minutes, curLeisure.minutes, (v) => formatDuration(v)],
                  ['Budget loisirs', prevLeisure.cost, curLeisure.cost, (v) => money(v)],
                ];
                return rows.map(([label, a, b, fmt]) => {
                  const diff = b - a;
                  return (
                    <tr key={label}>
                      <td style={{ fontWeight: 550 }}>{label}</td>
                      <td className="num muted">{fmt(a)}</td>
                      <td className="num">{fmt(b)}</td>
                      <td className="num" style={{ color: diff === 0 ? 'var(--ink-muted)' : diff > 0 ? 'var(--good-text)' : 'var(--critical)' }}>
                        {diff >= 0 ? '+' : '−'} {fmt(Math.abs(diff))}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
