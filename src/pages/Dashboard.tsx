import { Card, EmptyState, ProgressBar, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { slotColor } from '../components/charts/util';
import { useMoney, useStore } from '../store/store';
import {
  budgetLines, businessStats, cashflow, expensesByCategory, goalProgress,
  habitDone, habitStats, lifeScore, monthTotals, monthTotalsUpTo, netWorth, taskStats, eventsOn, tasksDue,
} from '../store/selectors';
import { addMonths, formatDuration, fromISO, minutesBetween, monthKey, monthLabel, startOfMonth, today } from '../lib/date';
import { DOMAIN_META, domainColor } from '../lib/domains';

export function Dashboard({ month, onNavigate }: { month: string; onNavigate: (id: string) => void }) {
  const { state, toggleHabit, update } = useStore();
  const money = useMoney();
  const now = today();

  const totals = monthTotals(state, month);
  const prevMonth = monthKey(addMonths(startOfMonth(`${month}-01`), -1));
  // Le mois en cours est incomplet : on le compare au même nombre de jours du mois précédent.
  const isCurrentMonth = month === monthKey(now);
  const prev = isCurrentMonth
    ? monthTotalsUpTo(state, prevMonth, fromISO(now).getDate())
    : monthTotals(state, prevMonth);
  const compareLabel = isCurrentMonth ? 'vs même période le mois dernier' : 'vs mois précédent';
  const flow = cashflow(state, 6, `${month}-15`);
  const cats = expensesByCategory(state, month);
  const budgets = budgetLines(state, month).slice(0, 5);
  const tStats = taskStats(state);
  const score = lifeScore(state, now);
  const todayEvents = eventsOn(state, now);
  const dueTasks = tasksDue(state, now).slice(0, 6);
  const habits = state.habits.filter((h) => !h.archived);
  const activeBusinesses = state.businesses.filter((b) => b.status === 'actif' || b.status === 'lancement');

  const donutSlices = (() => {
    const top = cats.slice(0, 6).map((c) => ({ label: c.name, value: c.value, color: slotColor(c.slot) }));
    const rest = cats.slice(6).reduce((s, c) => s + c.value, 0);
    if (rest > 0) top.push({ label: 'Autres', value: rest, color: 'var(--ink-muted)' });
    return top;
  })();

  const pctDelta = (cur: number, before: number) => (before > 0 ? ((cur - before) / before) * 100 : 0);
  const expDelta = pctDelta(totals.expense, prev.expense);
  const incDelta = pctDelta(totals.income, prev.income);

  return (
    <>
      <section className="dashboard-welcome" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">VOTRE QUOTIDIEN, EN PLUS SIMPLE</span>
          <h2 id="welcome-title">De la place pour<br />ce qui compte.</h2>
          <p>Un peu d’organisation, beaucoup de liberté.<br />Avancez à votre rythme, un jour à la fois.</p>
          <button className="btn btn-primary" onClick={() => onNavigate('calendar')}>
            Organiser ma journée <Icon name="chevronRight" size={16} />
          </button>
        </div>
        <div className="daily-focus">
          <div className="focus-date"><Icon name="sun" size={18} />{fromISO(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h3>Chaque petit pas compte.</h3>
          <button onClick={() => onNavigate('tasks')} className="focus-link"><span><Icon name="check" size={17} /> Tâches à faire aujourd’hui</span><strong>{tasksDue(state, now).length}</strong></button>
          <button onClick={() => onNavigate('habits')} className="focus-link"><span><Icon name="flame" size={17} /> Habitudes accomplies</span><strong>{habits.filter((h) => habitDone(state, h.id, now)).length}<small> / {habits.length}</small></strong></button>
          <button onClick={() => onNavigate('goals')} className="focus-bottom">Retrouver mes objectifs <Icon name="chevronRight" size={15} /></button>
        </div>
      </section>
      <div className="section-heading"><h2>L’essentiel du mois</h2><span>{monthLabel(month)}</span></div>
      <div className="grid grid-kpi">
        <StatTile
          label="Patrimoine net"
          value={money(netWorth(state))}
          foot={`${state.accounts.length} comptes suivis`}
        />
        <StatTile
          label={`Revenus · ${monthLabel(month, true)}`}
          value={money(totals.income)}
          delta={prev.income ? `${incDelta >= 0 ? '+' : ''}${incDelta.toFixed(0)} %` : undefined}
          tone={incDelta > 1 ? 'up' : incDelta < -1 ? 'down' : 'flat'}
          foot={compareLabel}
        />
        <StatTile
          label={`Dépenses · ${monthLabel(month, true)}`}
          value={money(totals.expense)}
          delta={prev.expense ? `${expDelta >= 0 ? '+' : ''}${expDelta.toFixed(0)} %` : undefined}
          tone={expDelta > 1 ? 'down' : expDelta < -1 ? 'up' : 'flat'}
          foot={compareLabel}
        />
        <StatTile
          label="Reste du mois"
          value={money(totals.net)}
          foot={`Taux d’épargne ${totals.savingRate.toFixed(0)} %`}
        />
        <StatTile
          label="Score de vie"
          value={`${score.total}/100`}
          foot={score.parts.map((p) => `${p.label} ${p.value}`).join(' · ')}
        />
      </div>

      <div className="grid grid-2">
        <Card
          title="Flux de trésorerie"
          subtitle="Revenus et dépenses des 6 derniers mois"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('finance')}>
              Détail
              <Icon name="chevronRight" size={14} />
            </button>
          }
        >
          <BarChart
            labels={flow.map((f) => monthLabel(f.key, true))}
            series={[
              { name: 'Revenus', color: 'var(--s3)', values: flow.map((f) => f.income) },
              { name: 'Dépenses', color: 'var(--s2)', values: flow.map((f) => f.expense) },
            ]}
            format={(v) => money(v, true)}
            tableHead="Mois"
            height={210}
          />
        </Card>

        <Card title="Répartition des dépenses" subtitle={monthLabel(month)}>
          {cats.length ? (
            <DonutChart
              slices={donutSlices}
              format={(v) => money(v)}
              centerValue={money(totals.expense, true)}
              centerLabel="dépensés ce mois"
              height={220}
            />
          ) : (
            <EmptyState icon="wallet" text="Aucune dépense enregistrée sur ce mois." />
          )}
        </Card>
      </div>

      <div className="grid grid-3">
        <Card
          title="Aujourd’hui"
          subtitle={`${todayEvents.length} événement${todayEvents.length > 1 ? 's' : ''} · ${formatDuration(
            todayEvents.reduce((s, e) => s + minutesBetween(e.start, e.end), 0),
          )} planifiées`}
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('calendar')}>
              Agenda
            </button>
          }
        >
          {todayEvents.length ? (
            <div className="list">
              {todayEvents.map((e) => (
                <div className="row" key={e.id}>
                  <span style={{ color: domainColor(e.domain) }}>
                    <Icon name="clock" size={15} />
                  </span>
                  <div className="row-main">
                    <div className="row-title">{e.title}</div>
                    <div className="row-sub">
                      <span>
                        {e.start} – {e.end}
                      </span>
                      <span className="pill-domain" style={{ color: domainColor(e.domain) }}>
                        {DOMAIN_META[e.domain].label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="calendar" text="Journée libre : parfait pour avancer sur vos objectifs." />
          )}
        </Card>

        <Card
          title="À faire"
          subtitle={`${tStats.open} ouvertes · ${tStats.late} en retard`}
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('tasks')}>
              Tout voir
            </button>
          }
        >
          {dueTasks.length ? (
            <div className="list">
              {dueTasks.map((t) => (
                <div className="row" key={t.id}>
                  <button
                    className="checkbox"
                    aria-label={`Terminer ${t.title}`}
                    onClick={() => update('tasks', t.id, { done: true, doneAt: now })}
                  >
                    <Icon name="check" size={12} />
                  </button>
                  <div className="row-main">
                    <div className="row-title">{t.title}</div>
                    <div className="row-sub">
                      <span className="pill-domain" style={{ color: domainColor(t.domain) }}>
                        {DOMAIN_META[t.domain].label}
                      </span>
                      {t.due && t.due < now && <span style={{ color: 'var(--critical)' }}>En retard</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="check" text="Rien d’urgent. Tout est sous contrôle." />
          )}
        </Card>

        <Card
          title="Habitudes du jour"
          subtitle="Un clic pour valider"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('habits')}>
              Détail
            </button>
          }
        >
          {habits.length ? (
            <div className="list">
              {habits.map((h) => {
                const st = habitStats(state, h, now);
                const done = habitDone(state, h.id, now);
                return (
                  <div className="row" key={h.id}>
                    <button className={`checkbox${done ? ' on' : ''}`} onClick={() => toggleHabit(h.id, now)} aria-label={h.name}>
                      <Icon name="check" size={12} />
                    </button>
                    <div className="row-main">
                      <div className={`row-title${done ? '' : ''}`}>{h.name}</div>
                      <div className="row-sub">
                        <span>
                          {st.weekCount}/{h.weeklyTarget} cette semaine
                        </span>
                        {st.streak > 1 && (
                          <span style={{ color: 'var(--s2)' }}>
                            <Icon name="flame" size={11} /> {st.streak} j
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="flame" text="Créez votre première habitude pour lancer le suivi." />
          )}
        </Card>
      </div>

      <div className="grid grid-3">
        <Card title="Budgets du mois" subtitle="Les postes les plus tendus" actions={
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('recurring')}>
            Gérer
          </button>
        }>
          {budgets.length ? (
            <div className="stack" style={{ gap: 12 }}>
              {budgets.map((b) => (
                <div key={b.id}>
                  <div className="flex small" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 550 }}>{b.name}</span>
                    <div className="spacer" />
                    <span className="tnum">
                      {money(b.spent)} <span className="muted">/ {money(b.budget)}</span>
                    </span>
                  </div>
                  <ProgressBar
                    pct={b.pct}
                    color={b.pct > 100 ? 'var(--critical)' : b.pct > 85 ? 'var(--warning)' : slotColor(b.slot)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="wallet" text="Définissez des budgets par catégorie pour suivre vos limites." />
          )}
        </Card>

        <Card title="Business" subtitle="Objectif de CA mensuel" actions={
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('business')}>
            Détail
          </button>
        }>
          {activeBusinesses.length ? (
            <div className="stack" style={{ gap: 12 }}>
              {activeBusinesses.map((b) => {
                const st = businessStats(state, b.id, month);
                return (
                  <div key={b.id}>
                    <div className="flex small" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 550 }}>{b.name}</span>
                      <div className="spacer" />
                      <span className="tnum">
                        {money(st.revenue)} <span className="muted">/ {money(st.goal)}</span>
                      </span>
                    </div>
                    <ProgressBar pct={st.goalPct} color={slotColor(b.slot)} />
                    <div className="small muted" style={{ marginTop: 3 }}>
                      Marge {money(st.margin)} · {st.goalPct.toFixed(0)} % de l’objectif
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="briefcase" text="Ajoutez un business pour suivre son chiffre d’affaires." />
          )}
        </Card>

        <Card title="Objectifs" subtitle="Progression en cours" actions={
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('goals')}>
            Tout voir
          </button>
        }>
          {state.goals.length ? (
            <div className="stack" style={{ gap: 12 }}>
              {state.goals
                .filter((g) => !g.done)
                .slice(0, 4)
                .map((g) => {
                  const p = goalProgress(state, g, now);
                  return (
                    <div key={g.id}>
                      <div className="flex small" style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 550 }}>{g.title}</span>
                        <div className="spacer" />
                        <span className="tnum">{p.pct.toFixed(0)} %</span>
                      </div>
                      <ProgressBar pct={p.pct} color={`var(--s${DOMAIN_META[g.domain].slot})`} />
                      <div className="small muted" style={{ marginTop: 3 }}>
                        {p.current.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} / {g.target.toLocaleString('fr-FR')} {g.unit} · {p.label}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <EmptyState icon="target" text="Fixez un objectif pour donner une direction à vos mois." />
          )}
        </Card>
      </div>
    </>
  );
}
