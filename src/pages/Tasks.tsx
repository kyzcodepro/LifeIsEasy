import { useMemo, useState } from 'react';
import { Card, EmptyState, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { TaskModal } from '../components/forms/TaskModal';
import { ScheduleTask } from '../components/forms/ScheduleTask';
import { QuickCapture } from '../components/forms/QuickCapture';
import { useExperience } from '../store/experience';
import { useStore } from '../store/store';
import { taskStats } from '../store/selectors';
import { addDays, formatDuration, relativeDay, today } from '../lib/date';
import { DOMAIN_META, DOMAIN_OPTIONS, PRIORITY_META, domainColor } from '../lib/domains';
import type { Domain, Task } from '../types';

type Filter = 'toutes' | 'aujourdhui' | 'semaine' | 'retard' | 'terminees';

export function TasksPage() {
  const { state, remove } = useStore();
  const { complete, postpone } = useExperience();
  const [planning, setPlanning] = useState<Task | null>(null);
  const now = today();
  const [filter, setFilter] = useState<Filter>('toutes');
  const [domain, setDomain] = useState<Domain | 'tous'>('tous');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const stats = taskStats(state);

  const filtered = useMemo(() => {
    const weekEnd = addDays(now, 7);
    return state.tasks
      .filter((t) => (domain === 'tous' ? true : t.domain === domain))
      .filter((t) => (query ? t.title.toLowerCase().includes(query.toLowerCase()) : true))
      .filter((t) => {
        switch (filter) {
          case 'aujourdhui':
            return !t.done && t.due === now;
          case 'semaine':
            return !t.done && !!t.due && t.due >= now && t.due <= weekEnd;
          case 'retard':
            return !t.done && !!t.due && t.due < now;
          case 'terminees':
            return t.done;
          default:
            return !t.done;
        }
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const pa = PRIORITY_META[a.priority].rank;
        const pb = PRIORITY_META[b.priority].rank;
        if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
        if (a.due && !b.due) return -1;
        if (!a.due && b.due) return 1;
        return pa - pb;
      });
  }, [state.tasks, filter, domain, query, now]);

  const plannedMinutes = filtered.filter((t) => !t.done).reduce((s, t) => s + (t.estimate ?? 0), 0);

  return (
    <>
      <div className="grid grid-kpi">
        <StatTile label="Tâches ouvertes" value={String(stats.open)} foot={`${stats.todayCount} pour aujourd’hui`} small />
        <StatTile label="En retard" value={String(stats.late)} foot="à traiter en priorité" small />
        <StatTile label="Terminées cette semaine" value={String(stats.doneThisWeek)} foot="depuis lundi" small />
        <StatTile label="Charge estimée" value={formatDuration(plannedMinutes)} foot="sur la sélection" small />
      </div>

      <Card
        title="Liste des tâches"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            Nouvelle tâche
          </button>
        }
      >
        <div className="flex flex-wrap" style={{ marginBottom: 12, gap: 8 }}>
          <div className="segmented">
            {(['toutes', 'aujourdhui', 'semaine', 'retard', 'terminees'] as Filter[]).map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {{ toutes: 'À faire', aujourdhui: 'Aujourd’hui', semaine: '7 jours', retard: 'En retard', terminees: 'Terminées' }[f]}
              </button>
            ))}
          </div>
          <select className="select" style={{ width: 'auto' }} value={domain} onChange={(e) => setDomain(e.target.value as Domain | 'tous')}>
            <option value="tous">Tous les domaines</option>
            {DOMAIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input className="input" style={{ width: 'auto', flex: '1 1 160px' }} placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {filtered.length ? (
          <div className="list">
            {filtered.map((t) => (
              <div className="row" key={t.id}>
                <button
                  className={`checkbox${t.done ? ' on' : ''}`}
                  aria-label={`${t.done ? 'Rouvrir' : 'Terminer'} ${t.title}`}
                  aria-pressed={t.done}
                  onClick={() => complete(t)}
                >
                  <Icon name="check" size={12} />
                </button>
                <div className="row-main">
                  <div className={`row-title${t.done ? ' strike' : ''}`}>{t.title}</div>
                  <div className="row-sub">
                    <span className="pill-domain" style={{ color: domainColor(t.domain) }}>
                      {DOMAIN_META[t.domain].label}
                    </span>
                    <span style={{ color: PRIORITY_META[t.priority].color }}>{PRIORITY_META[t.priority].label}</span>
                    {t.due && <span style={t.due < now && !t.done ? { color: 'var(--critical)' } : undefined}>{relativeDay(t.due)}</span>}
                    {t.estimate ? <span>{formatDuration(t.estimate)}</span> : null}
                    {t.businessId && <span>{state.businesses.find((b) => b.id === t.businessId)?.name}</span>}
                  </div>
                </div>
                <div className="row-actions">
                  {!t.done && <><button className="btn btn-sm" onClick={() => postpone(t)} aria-label={`Reporter ${t.title} au lendemain`}>+1 jour</button>
                  <button className="btn btn-sm" onClick={() => setPlanning(t)}>Planifier</button></>}
                  <button className="btn btn-ghost btn-icon" onClick={() => setEditing(t)} aria-label="Modifier">
                    <Icon name="edit" size={14} />
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => remove('tasks', t.id)} aria-label="Supprimer">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="check" text="Aucune tâche dans cette vue." action={
            <button className="btn btn-sm" onClick={() => setCreating(true)}>
              Ajouter une tâche
            </button>
          } />
        )}
      </Card>

      {creating && <QuickCapture onClose={() => setCreating(false)} />}
      {planning && <ScheduleTask task={planning} onClose={() => setPlanning(null)} />}
      {editing && <TaskModal initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
