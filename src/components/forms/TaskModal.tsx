import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field, NumberInput, Select, TextArea, TextInput } from '../ui/Field';
import { useStore } from '../../store/store';
import { uid } from '../../lib/id';
import { DOMAIN_OPTIONS, PRIORITY_OPTIONS } from '../../lib/domains';
import type { Domain, Priority, Task } from '../../types';

export function TaskModal({ initial, defaultDue, onClose }: { initial?: Task; defaultDue?: string; onClose: () => void }) {
  const { state, add, update, remove } = useStore();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [domain, setDomain] = useState<Domain>(initial?.domain ?? 'perso');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'normale');
  const [due, setDue] = useState(initial?.due ?? defaultDue ?? '');
  const [estimate, setEstimate] = useState(initial?.estimate ?? 30);
  const [businessId, setBusinessId] = useState(initial?.businessId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const submit = () => {
    if (!title.trim()) return;
    const payload: Task = {
      id: initial?.id ?? uid('tk'),
      title: title.trim(),
      domain,
      priority,
      due: due || undefined,
      done: initial?.done ?? false,
      doneAt: initial?.doneAt,
      businessId: businessId || undefined,
      estimate: estimate || undefined,
      notes: notes.trim() || undefined,
    };
    if (initial) update('tasks', initial.id, payload);
    else add('tasks', payload);
    onClose();
  };

  return (
    <Modal
      title={initial ? 'Modifier la tâche' : 'Nouvelle tâche'}
      onClose={onClose}
      onSubmit={submit}
      footer={
        initial ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              remove('tasks', initial.id);
              onClose();
            }}
          >
            Supprimer
          </button>
        ) : undefined
      }
    >
      <div className="form-grid">
        <Field label="Tâche" full>
          <TextInput value={title} onChange={setTitle} placeholder="Appeler la banque, publier un post…" required />
        </Field>
        <Field label="Domaine">
          <Select value={domain} onChange={setDomain} options={DOMAIN_OPTIONS} />
        </Field>
        <Field label="Priorité">
          <Select value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
        </Field>
        <Field label="Échéance">
          <TextInput type="date" value={due} onChange={setDue} />
        </Field>
        <Field label="Durée estimée (min)">
          <NumberInput value={estimate} onChange={setEstimate} step="5" min="0" />
        </Field>
        <Field label="Business lié" full>
          <Select
            value={businessId}
            onChange={setBusinessId}
            options={[{ value: '', label: 'Aucun' }, ...state.businesses.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </Field>
        <Field label="Notes" full>
          <TextArea value={notes} onChange={setNotes} />
        </Field>
      </div>
    </Modal>
  );
}
