import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useExperience } from '../../store/experience';
import { today, formatDuration } from '../../lib/date';
import type { Task } from '../../types';

export function ScheduleTask({ task, onClose }: { task: Task; onClose: () => void }) {
  const { schedule } = useExperience();
  const [date, setDate] = useState(task.due ?? today());
  const [start, setStart] = useState('09:00');
  const [failed, setFailed] = useState(false);
  return <Modal title="Planifier la tâche" onClose={onClose} submitLabel="Placer dans l’agenda" onSubmit={() => {
    if (schedule(task.id, date, start)) onClose();
    else setFailed(true);
  }}>
    <strong>{task.title}</strong>
    <p className="small muted">Durée : {formatDuration(task.estimate || 30)}. Un créneau existant pour cette tâche sera déplacé.</p>
    <div className="form-grid">
      <label className="field">Date<input className="input" type="date" required value={date} onChange={(e) => { setDate(e.target.value); setFailed(false); }} /></label>
      <label className="field">Heure<input className="input" type="time" required value={start} onChange={(e) => { setStart(e.target.value); setFailed(false); }} /></label>
    </div>
    {failed && <p role="alert">Le créneau n’a pas été enregistré. Choisissez une heure libre et une durée qui ne dépasse pas minuit.</p>}
  </Modal>;
}
