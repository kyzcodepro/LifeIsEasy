import { useState } from 'react';
import { Card, EmptyState } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { PersonalScore } from '../components/ui/PersonalScore';
import { QuickCapture } from '../components/forms/QuickCapture';
import { ScheduleTask } from '../components/forms/ScheduleTask';
import { useStore } from '../store/store';
import { useExperience } from '../store/experience';
import { eventsOn, habitDone } from '../store/selectors';
import { dailyPriorities } from '../lib/planning';
import { today, fromISO, relativeDay } from '../lib/date';
import { DOMAIN_META } from '../lib/domains';
import type { Task } from '../types';

export function Dashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { state } = useStore();
  const { complete, postpone, toggleHabit } = useExperience();
  const [capturing, setCapturing] = useState(false);
  const [planning, setPlanning] = useState<Task | null>(null);
  const now = today();
  const priorities = dailyPriorities(state.tasks, now);
  const next = priorities[0];
  const habits = state.habits.filter((h) => !h.archived);
  const events = eventsOn(state, now);
  return <>
    <section className="home-intro">
      <div><span className="eyebrow">{fromISO(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h2>Une chose à la fois.</h2><p>Trois priorités maximum. Le reste peut attendre.</p></div>
      <button className="btn btn-primary" onClick={() => setCapturing(true)}><Icon name="plus" size={18} /> Une idée, une tâche</button>
    </section>
    <section className="next-action" aria-labelledby="next-action-title">
      <div><span className="eyebrow">PROCHAINE ACTION</span><h2 id="next-action-title">{next?.title ?? 'Votre journée est à vous.'}</h2>
        <p>{next ? `${DOMAIN_META[next.domain].label}${next.estimate ? ` · ${next.estimate} min` : ''}` : 'Aucune priorité à traiter. Retrouvez vos tâches à venir ou gardez une idée pour plus tard.'}</p></div>
      {next ? <button className="btn" onClick={() => complete(next)}><Icon name="check" size={18} /> C’est fait</button> : <button className="btn" onClick={() => onNavigate('tasks')}>Voir mes tâches</button>}
    </section>
    <div className="home-columns">
      <Card title="Mes trois priorités" subtitle="Priorité haute d’abord, puis échéance · tâches dues ou sans date" actions={<button className="btn btn-ghost btn-sm" onClick={() => onNavigate('tasks')}>Toutes les tâches</button>}>
        {priorities.length ? <div className="list">{priorities.map((task, index) => <div className="priority-row" key={task.id}>
          <button className="checkbox" aria-label={`Terminer ${task.title}`} onClick={() => complete(task)}><Icon name="check" size={16} /></button>
          <div className="row-main"><span className="priority-number">0{index + 1}</span><h3>{task.title}</h3><p className="small muted">{task.due ? relativeDay(task.due) : 'Sans échéance'} · {DOMAIN_META[task.domain].label}</p></div>
          <div className="priority-actions"><button className="btn btn-sm" onClick={() => postpone(task)} aria-label={`Reporter ${task.title} au lendemain`}>Reporter</button><button className="btn btn-ghost btn-sm" onClick={() => setPlanning(task)}>Planifier</button></div>
        </div>)}</div> : <EmptyState icon="check" text="Rien à traiter aujourd’hui." />}
      </Card>
      <div className="stack">
        <Card title="Mon agenda" actions={<button className="btn btn-ghost btn-sm" onClick={() => onNavigate('calendar')}>Ouvrir</button>}>
          {events.length ? events.slice(0, 3).map((event) => <div className="row" key={event.id}><span className="agenda-time">{event.start}</span><span className="row-main">{event.title}</span></div>) : <p className="muted small">Aucun créneau prévu aujourd’hui.</p>}
          {events.length > 3 && <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('calendar')}>Voir les {events.length} événements</button>}
        </Card>
        <Card title="Mes habitudes" actions={<button className="btn btn-ghost btn-sm" onClick={() => onNavigate('habits')}>Toutes</button>}>
          {habits.length ? habits.slice(0, 4).map((habit) => {
            const done = habitDone(state, habit.id, now);
            return <button key={habit.id} className={`habit-quick${done ? ' is-done' : ''}`} aria-pressed={done} onClick={() => toggleHabit(habit.id, now)}><span>{habit.name}</span><Icon name={done ? 'check' : 'plus'} size={18} /></button>;
          }) : <p className="muted small">Ajoutez une habitude qui compte pour vous.</p>}
        </Card>
      </div>
    </div>
    <PersonalScore />
    {capturing && <QuickCapture onClose={() => setCapturing(false)} />}
    {planning && <ScheduleTask task={planning} onClose={() => setPlanning(null)} />}
  </>;
}
