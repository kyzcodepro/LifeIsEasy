import { useStore } from '../../store/store';
import { lifeScore } from '../../store/selectors';
import { Card, ProgressBar } from './Card';

export function PersonalScore() {
  const { state, setSettings } = useStore();
  if (!state.settings.showLifeScore) return null;
  const score = lifeScore(state);
  return <Card title="Mon indicateur personnel" subtitle="Données actuelles · repère facultatif" actions={
    <button className="btn btn-sm" onClick={() => setSettings({ showLifeScore: false })}>Masquer</button>
  }>
    <p><strong>{score.total}/100</strong> · moyenne à parts égales des cinq valeurs ci-dessous.</p>
    <p className="small muted">Cet indicateur décrit les données saisies, pas votre valeur ni votre bien-être. Des données manquantes peuvent changer fortement le résultat.</p>
    <div className="score-parts">{score.parts.map((p) => <div key={p.label}>
      <div className="flex"><span>{p.label}</span><span className="spacer" /><strong>{p.value}/100</strong></div>
      <ProgressBar pct={p.value} />
    </div>)}</div>
    <details className="score-explanation"><summary>Comprendre le calcul</summary>
      <ul>
        <li>Finances : moitié épargne, moitié budgets. La composante épargne est (taux d’épargne en % + 20) × 2,2, bornée entre 0 et 100. La composante budgets est le pourcentage de budgets tenus ; sans budget, elle vaut 80 si le solde du mois est positif ou nul, sinon 40.</li>
        <li>Productivité : 100 moins 12 points par tâche en retard, avec un minimum de 0.</li>
        <li>Santé & habitudes : validations des 14 derniers jours divisées par les cibles hebdomadaires ramenées à 14 jours, plafonnées à 100 %. Sans habitude active : 0.</li>
        <li>Business : moyenne des pourcentages d’objectifs de chiffre d’affaires du mois pour les activités actives ou en lancement, plafonnée à 100. Sans activité concernée : 60.</li>
        <li>Loisirs : temps enregistré ce mois divisé par les objectifs mensuels, plafonné à 100 %. Sans objectif de temps : 60.</li>
      </ul>
      <p>Chaque composante est arrondie, puis leur moyenne est arrondie. Les valeurs par défaut ne sont pas une évaluation personnelle. Vous pouvez désactiver cet indicateur dans Réglages.</p>
    </details>
  </Card>;
}
