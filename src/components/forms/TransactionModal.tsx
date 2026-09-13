import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field, NumberInput, Select, TextArea, TextInput } from '../ui/Field';
import { useStore } from '../../store/store';
import { today } from '../../lib/date';
import { uid } from '../../lib/id';
import type { Transaction, TxKind } from '../../types';

export function TransactionModal({ initial, onClose }: { initial?: Transaction; onClose: () => void }) {
  const { state, add, update } = useStore();
  const [kind, setKind] = useState<TxKind>(initial?.kind ?? 'depense');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [date, setDate] = useState(initial?.date ?? today());
  const cats = state.categories.filter((c) => c.kind === kind);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? cats[0]?.id ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? state.accounts[0]?.id ?? '');
  const [businessId, setBusinessId] = useState(initial?.businessId ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const submit = () => {
    if (!label.trim() || amount <= 0 || !categoryId || !accountId) return;
    const payload: Transaction = {
      id: initial?.id ?? uid('tx'),
      date,
      label: label.trim(),
      amount,
      kind,
      categoryId,
      accountId,
      businessId: businessId || undefined,
      note: note.trim() || undefined,
      recurringId: initial?.recurringId,
    };
    if (initial) update('transactions', initial.id, payload);
    else add('transactions', payload);
    onClose();
  };

  const switchKind = (k: TxKind) => {
    setKind(k);
    const first = state.categories.find((c) => c.kind === k);
    setCategoryId(first?.id ?? '');
  };

  return (
    <Modal title={initial ? 'Modifier l’opération' : 'Nouvelle opération'} onClose={onClose} onSubmit={submit}>
      <div className="segmented" style={{ alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={kind === 'depense'} onClick={() => switchKind('depense')}>
          Dépense
        </button>
        <button type="button" aria-pressed={kind === 'revenu'} onClick={() => switchKind('revenu')}>
          Revenu
        </button>
      </div>

      <div className="form-grid">
        <Field label="Libellé" full>
          <TextInput value={label} onChange={setLabel} placeholder="Courses, loyer, facture client…" required />
        </Field>
        <Field label="Montant">
          <NumberInput value={amount} onChange={setAmount} min="0" required />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={setDate} required />
        </Field>
        <Field label="Catégorie">
          <Select value={categoryId} onChange={setCategoryId} options={cats.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Compte">
          <Select
            value={accountId}
            onChange={setAccountId}
            options={state.accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Field>
        <Field label="Business (optionnel)" full>
          <Select
            value={businessId}
            onChange={setBusinessId}
            options={[{ value: '', label: 'Aucun' }, ...state.businesses.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </Field>
        <Field label="Note" full>
          <TextArea value={note} onChange={setNote} placeholder="Détail, moyen de paiement, contexte…" />
        </Field>
      </div>
    </Modal>
  );
}
