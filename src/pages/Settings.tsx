import { useRef, useState } from 'react';
import { Card, EmptyState, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Field, NumberInput, Select, TextInput } from '../components/ui/Field';
import { slotColor } from '../components/charts/util';
import { useMoney, useStore } from '../store/store';
import { accountBalance } from '../store/selectors';
import { uid } from '../lib/id';
import { today } from '../lib/date';
import type { Account, AppState, Category, TxKind } from '../types';

const ACCOUNT_TYPES: Array<{ value: Account['type']; label: string }> = [
  { value: 'courant', label: 'Compte courant' },
  { value: 'epargne', label: 'Épargne' },
  { value: 'especes', label: 'Espèces' },
  { value: 'business', label: 'Compte pro' },
  { value: 'investissement', label: 'Investissement' },
];

export function SettingsPage() {
  const { state, setSettings, add, update, remove, replaceAll, loadDemo, resetAll } = useStore();
  const money = useMoney();
  const fileRef = useRef<HTMLInputElement>(null);
  const [accountModal, setAccountModal] = useState<Account | 'new' | null>(null);
  const [categoryModal, setCategoryModal] = useState<Category | 'new' | null>(null);
  const [message, setMessage] = useState('');

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-is-easy-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Sauvegarde téléchargée.');
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
          throw new Error('format');
        }
        replaceAll(parsed);
        setMessage('Données importées avec succès.');
      } catch {
        setMessage('Fichier invalide : l’import a été annulé.');
      }
    };
    reader.readAsText(file);
  };

  const counts = {
    transactions: state.transactions.length,
    events: state.events.length,
    tasks: state.tasks.length,
    sessions: state.sessions.length,
    logs: Object.keys(state.habitLogs).length,
  };

  return (
    <>
      <Card title="Progression personnelle" subtitle="Choisissez ce qui vous aide, sans obligation de score.">
        <label className="preference-toggle"><input type="checkbox" checked={state.settings.showLifeScore === true} onChange={(e) => setSettings({ showLifeScore: e.target.checked })} /> Afficher mon indicateur personnel (ancien score de vie)</label>
        <p className="small muted">Masqué par défaut. Si vous l’activez, le détail du calcul est disponible sur l’accueil et dans Statistiques. Il reflète uniquement vos données saisies.</p>
      </Card>
      <div className="grid grid-kpi">
        <StatTile label="Opérations" value={String(counts.transactions)} foot="enregistrées" small />
        <StatTile label="Événements" value={String(counts.events)} foot="dans l’agenda" small />
        <StatTile label="Tâches" value={String(counts.tasks)} foot="créées" small />
        <StatTile label="Points de suivi" value={String(counts.sessions + counts.logs)} foot="séances + habitudes" small />
      </div>

      <div className="grid grid-2">
        <Card title="Profil & préférences">
          <div className="form-grid">
            <Field label="Votre prénom">
              <TextInput value={state.settings.userName} onChange={(v) => setSettings({ userName: v })} placeholder="Alex" />
            </Field>
            <Field label="Objectif d’épargne mensuel">
              <NumberInput value={state.settings.monthlySavingGoal} onChange={(v) => setSettings({ monthlySavingGoal: v })} step="50" min="0" />
            </Field>
            <Field label="Devise">
              <Select
                value={state.settings.currency}
                onChange={(v) => setSettings({ currency: v })}
                options={[
                  { value: 'EUR', label: 'Euro (€)' },
                  { value: 'USD', label: 'Dollar US ($)' },
                  { value: 'CHF', label: 'Franc suisse (CHF)' },
                  { value: 'GBP', label: 'Livre sterling (£)' },
                  { value: 'CAD', label: 'Dollar canadien (C$)' },
                  { value: 'MAD', label: 'Dirham marocain (MAD)' },
                  { value: 'XOF', label: 'Franc CFA (XOF)' },
                ]}
              />
            </Field>
            <Field label="Thème">
              <Select
                value={state.settings.theme}
                onChange={(v) => setSettings({ theme: v as 'light' | 'dark' | 'system' })}
                options={[
                  { value: 'system', label: 'Automatique (système)' },
                  { value: 'light', label: 'Clair' },
                  { value: 'dark', label: 'Sombre' },
                ]}
              />
            </Field>
          </div>
        </Card>

        <Card title="Sauvegarde & données" subtitle="Tout est stocké dans votre navigateur, rien n’est envoyé en ligne">
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <button className="btn" onClick={exportData}>
              <Icon name="download" size={15} />
              Exporter (JSON)
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} />
              Importer
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = '';
              }}
            />
            <button
              className="btn"
              onClick={() => {
                if (confirm('Remplacer les données actuelles par le jeu de démonstration ?')) {
                  loadDemo();
                  setMessage('Données de démonstration chargées.');
                }
              }}
            >
              <Icon name="sparkles" size={15} />
              Charger la démo
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm('Effacer toutes vos données ? Cette action est irréversible.')) {
                  resetAll();
                  setMessage('Tout a été réinitialisé.');
                }
              }}
            >
              <Icon name="trash" size={15} />
              Tout effacer
            </button>
          </div>
          {message && (
            <p className="small" style={{ marginTop: 10, color: 'var(--good-text)' }}>
              {message}
            </p>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>
            Exportez régulièrement : vider le cache du navigateur supprimerait vos données. Le fichier JSON peut être
            réimporté sur un autre appareil.
          </p>
        </Card>
      </div>

      <Card
        title="Comptes"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setAccountModal('new')}>
            <Icon name="plus" size={14} />
            Compte
          </button>
        }
      >
        {state.accounts.length ? (
          <div className="list">
            {state.accounts.map((a) => (
              <div className="row" key={a.id}>
                <span style={{ color: 'var(--s1)' }}>
                  <Icon name="wallet" size={16} />
                </span>
                <div className="row-main">
                  <div className="row-title">{a.name}</div>
                  <div className="row-sub">
                    <span>{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label}</span>
                    <span>Initial : {money(a.initialBalance)}</span>
                  </div>
                </div>
                <span className="row-value">{money(accountBalance(state, a.id))}</span>
                <div className="row-actions">
                  <button className="btn btn-ghost btn-icon" onClick={() => setAccountModal(a)} aria-label="Modifier">
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() =>
                      state.transactions.some((t) => t.accountId === a.id)
                        ? alert('Ce compte contient des opérations : supprimez-les ou déplacez-les d’abord.')
                        : remove('accounts', a.id)
                    }
                    aria-label="Supprimer"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="wallet" text="Ajoutez au moins un compte pour enregistrer vos opérations." />
        )}
      </Card>

      <Card
        title="Catégories"
        subtitle="Elles structurent vos budgets et vos statistiques"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setCategoryModal('new')}>
            <Icon name="plus" size={14} />
            Catégorie
          </button>
        }
      >
        <div className="grid grid-2">
          {(['depense', 'revenu'] as TxKind[]).map((kind) => (
            <div key={kind}>
              <h3 style={{ marginBottom: 8 }}>{kind === 'depense' ? 'Dépenses' : 'Revenus'}</h3>
              <div className="list">
                {state.categories.filter((c) => c.kind === kind).map((c) => (
                  <div className="row" key={c.id}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: slotColor(c.slot), flex: 'none' }} />
                    <div className="row-main">
                      <div className="row-title">{c.name}</div>
                      {kind === 'depense' && (
                        <div className="row-sub">
                          <span>{c.budget > 0 ? `Budget ${money(c.budget)}/mois` : 'Sans budget'}</span>
                        </div>
                      )}
                    </div>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-icon" onClick={() => setCategoryModal(c)} aria-label="Modifier">
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() =>
                          state.transactions.some((t) => t.categoryId === c.id)
                            ? alert('Cette catégorie est utilisée par des opérations.')
                            : remove('categories', c.id)
                        }
                        aria-label="Supprimer"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="À propos">
        <p className="small muted">
          <strong>Life Is Easy</strong> — planificateur de vie complet : agenda, tâches, finances, business, loisirs,
          habitudes et objectifs. Application 100 % locale : vos données restent sur votre appareil (stockage du
          navigateur) et peuvent être exportées à tout moment.
        </p>
      </Card>

      {accountModal && (
        <AccountModal
          initial={accountModal === 'new' ? undefined : accountModal}
          onClose={() => setAccountModal(null)}
          onSave={(a) => (accountModal === 'new' ? add('accounts', a) : update('accounts', a.id, a))}
        />
      )}
      {categoryModal && (
        <CategoryModal
          initial={categoryModal === 'new' ? undefined : categoryModal}
          onClose={() => setCategoryModal(null)}
          onSave={(c) => (categoryModal === 'new' ? add('categories', c) : update('categories', c.id, c))}
        />
      )}
    </>
  );
}

function AccountModal({ initial, onClose, onSave }: { initial?: Account; onClose: () => void; onSave: (a: Account) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<Account['type']>(initial?.type ?? 'courant');
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance ?? 0);

  return (
    <Modal
      title={initial ? 'Modifier le compte' : 'Nouveau compte'}
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return;
        onSave({ id: initial?.id ?? uid('acc'), name: name.trim(), type, initialBalance });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Nom" full>
          <TextInput value={name} onChange={setName} placeholder="Compte courant, Livret A…" required />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={setType} options={ACCOUNT_TYPES} />
        </Field>
        <Field label="Solde initial">
          <NumberInput value={initialBalance} onChange={setInitialBalance} />
        </Field>
      </div>
    </Modal>
  );
}

function CategoryModal({ initial, onClose, onSave }: { initial?: Category; onClose: () => void; onSave: (c: Category) => void }) {
  const { state } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<TxKind>(initial?.kind ?? 'depense');
  const [budget, setBudget] = useState(initial?.budget ?? 0);
  const [slot, setSlot] = useState(initial?.slot ?? ((state.categories.length % 8) + 1));

  return (
    <Modal
      title={initial ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return;
        onSave({ id: initial?.id ?? uid('cat'), name: name.trim(), kind, budget: kind === 'depense' ? budget : 0, slot });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Nom" full>
          <TextInput value={name} onChange={setName} placeholder="Courses, Loyer, Freelance…" required />
        </Field>
        <Field label="Type">
          <Select
            value={kind}
            onChange={setKind}
            options={[
              { value: 'depense', label: 'Dépense' },
              { value: 'revenu', label: 'Revenu' },
            ]}
          />
        </Field>
        {kind === 'depense' && (
          <Field label="Budget mensuel (0 = aucun)">
            <NumberInput value={budget} onChange={setBudget} step="10" min="0" />
          </Field>
        )}
        <Field label="Couleur" full>
          <div className="flex" style={{ gap: 6 }}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                aria-label={`Couleur ${s}`}
                aria-pressed={slot === s}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: slotColor(s),
                  border: slot === s ? '2px solid var(--ink)' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
