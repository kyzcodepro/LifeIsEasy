import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field, Select, TextArea, TextInput } from '../ui/Field';
import { useStore } from '../../store/store';
import { today } from '../../lib/date';
import { uid } from '../../lib/id';
import { DOMAIN_OPTIONS } from '../../lib/domains';
import type { CalendarEvent, Domain, EventRepeat } from '../../types';

const REPEAT_OPTIONS: Array<{ value: EventRepeat; label: string }> = [
  { value: 'aucune', label: 'Ne pas répéter' },
  { value: 'quotidien', label: 'Tous les jours' },
  { value: 'hebdo', label: 'Chaque semaine' },
  { value: 'mensuel', label: 'Chaque mois' },
];

export function EventModal({
  initial,
  defaultDate,
  defaultStart,
  onClose,
}: {
  initial?: CalendarEvent;
  defaultDate?: string;
  defaultStart?: string;
  onClose: () => void;
}) {
  const { state, add, update, remove } = useStore();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? today());
  const [start, setStart] = useState(initial?.start ?? defaultStart ?? '09:00');
  const [end, setEnd] = useState(initial?.end ?? (defaultStart ? addHour(defaultStart) : '10:00'));
  const [domain, setDomain] = useState<Domain>(initial?.domain ?? 'perso');
  const [repeat, setRepeat] = useState<EventRepeat>(initial?.repeat ?? 'aucune');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [businessId, setBusinessId] = useState(initial?.businessId ?? '');

  const submit = () => {
    if (!title.trim()) return;
    const payload: CalendarEvent = {
      id: initial?.id ?? uid('ev'),
      title: title.trim(),
      date,
      start,
      end: end > start ? end : addHour(start),
      domain,
      repeat,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      businessId: businessId || undefined,
      doneDates: initial?.doneDates ?? [],
    };
    if (initial) update('events', initial.id, payload);
    else add('events', payload);
    onClose();
  };

  return (
    <Modal
      title={initial ? 'Modifier l’événement' : 'Nouvel événement'}
      onClose={onClose}
      onSubmit={submit}
      footer={
        initial ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              remove('events', initial.id);
              onClose();
            }}
          >
            Supprimer
          </button>
        ) : undefined
      }
    >
      <div className="form-grid">
        <Field label="Titre" full>
          <TextInput value={title} onChange={setTitle} placeholder="Sport, réunion, dîner…" required />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={setDate} required />
        </Field>
        <Field label="Domaine">
          <Select value={domain} onChange={setDomain} options={DOMAIN_OPTIONS} />
        </Field>
        <Field label="Début">
          <TextInput type="time" value={start} onChange={setStart} required />
        </Field>
        <Field label="Fin">
          <TextInput type="time" value={end} onChange={setEnd} required />
        </Field>
        <Field label="Répétition">
          <Select value={repeat} onChange={setRepeat} options={REPEAT_OPTIONS} />
        </Field>
        <Field label="Business lié">
          <Select
            value={businessId}
            onChange={setBusinessId}
            options={[{ value: '', label: 'Aucun' }, ...state.businesses.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </Field>
        <Field label="Lieu" full>
          <TextInput value={location} onChange={setLocation} placeholder="Bureau, visio, salle de sport…" />
        </Field>
        <Field label="Notes" full>
          <TextArea value={notes} onChange={setNotes} />
        </Field>
      </div>
    </Modal>
  );
}

function addHour(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
