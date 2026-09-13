import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useStore } from '../../store/store';
import { useExperience } from '../../store/experience';
import { uid } from '../../lib/id';
import { today } from '../../lib/date';

export function QuickCapture({ onClose }: { onClose: () => void }) {
  const { add, remove } = useStore();
  const { notify } = useExperience();
  const [title, setTitle] = useState('');
  const [forToday, setForToday] = useState(false);
  return <Modal title="Une idée, une tâche" onClose={onClose} submitLabel="Ajouter" onSubmit={() => {
    if (!title.trim()) return;
    const id = uid('tk');
    add('tasks', { id, title: title.trim(), domain: 'perso', priority: 'normale', done: false, due: forToday ? today() : undefined });
    notify(forToday ? 'Tâche ajoutée pour aujourd’hui.' : 'Idée conservée dans vos tâches, sans échéance.', () => remove('tasks', id));
    onClose();
  }}>
    <label className="field">À garder en tête
      <input className="input" autoFocus required maxLength={240} placeholder="Une seule phrase suffit…" value={title} onChange={(e) => setTitle(e.target.value)} />
    </label>
    <label className="preference-toggle"><input type="checkbox" checked={forToday} onChange={(e) => setForToday(e.target.checked)} /> À faire aujourd’hui</label>
    <p className="small muted">Sans échéance, votre idée reste dans la liste des tâches. Vous pourrez la préciser plus tard.</p>
  </Modal>;
}
