# Life Is Easy

Application web complète pour **planifier toute sa vie** : agenda semaine par semaine, tâches,
dépenses, rentrées d'argent, business, loisirs, habitudes et objectifs — avec du **tracking partout**.

100 % côté client : aucune base de données, aucun compte à créer. Les données vivent dans le
navigateur (localStorage) et s'exportent/s'importent en JSON. Prête à déployer sur Vercel.

## Fonctionnalités

| Module | Ce qu'il fait | Ce qui est tracké |
|---|---|---|
| **Tableau de bord** | Trois priorités, prochaine action, agenda et habitudes du jour | Validation avec annulation, report rapide et capture d’une idée |
| **Calendrier** | Vue semaine (lundi → dimanche, heure par heure) et vue mois, événements récurrents, création par clic sur une plage | Temps planifié par domaine, temps libre, événements tenus (double-clic) |
| **Tâches** | Priorités, échéances, domaines, durée estimée, rattachement à un business | Ouvertes, en retard, terminées par semaine, charge estimée |
| **Finances** | Opérations (dépense/revenu), comptes multiples, filtres et recherche | Solde par compte, patrimoine net, taux d'épargne, dépenses par catégorie, revenus par source |
| **Business** | Plusieurs activités, objectif de CA mensuel, jalons | CA, charges, marge, atteinte de l'objectif, historique 6 mois par business |
| **Récurrents & budgets** | Loyer, abonnements, salaires… générés automatiquement à chaque échéance ; budget mensuel par catégorie | Charges fixes, revenus récurrents, reste à vivre théorique, dépassements de budget |
| **Loisirs** | Activités, journal des séances (durée, coût, plaisir), liste d'envies avec épargne dédiée | Heures par activité vs objectif, budget loisirs, note de plaisir moyenne |
| **Habitudes** | Validation d'un clic, objectif hebdomadaire | Séries en cours et records, régularité 7/30 jours, carte de densité sur 12 semaines |
| **Objectifs** | Cibles chiffrées avec échéance | Progression manuelle ou **automatique** (solde d'épargne, CA d'un business, habitude de la semaine) |
| **Statistiques** | Toutes les données croisées | Équilibre de vie par domaine, 12 mois de flux, taux d'épargne, où part le temps / l'argent, comparaison mensuelle à période comparable |
| **Réglages** | Profil, devise, thème clair/sombre/auto, comptes, catégories | Export / import JSON, jeu de démonstration, réinitialisation |

Autres points : interface en français, responsive (barre de navigation en bas sur mobile),
thème clair et sombre, palette de graphiques validée pour le daltonisme et le contraste,
graphiques SVG maison (aucune dépendance de charting) avec infobulles et **vue tableau** pour
chaque graphique.

## Démarrer en local

```bash
npm install
npm run dev      # http://localhost:5173
```

Autres scripts :

```bash
npm run build    # vérification TypeScript + build de production dans dist/
npm run preview  # sert le build de production
npm run test:experience # priorités, planification, annulation et rendu des routes
```

## Parcours du quotidien

- L’accueil affiche au plus trois tâches ouvertes dues aujourd’hui, en retard ou sans date, triées par priorité puis échéance. Les autres modules restent dans la navigation.
- « Une idée, une tâche » enregistre une phrase sans échéance, avec une option pour aujourd’hui. Le bouton flottant mobile ouvre directement cette saisie.
- Les tâches se planifient par glisser-déposer dans la semaine (pas de 30 minutes), dans le mois (9 h), ou par le bouton **Planifier**, utilisable au clavier et sur mobile. Une tâche déjà planifiée déplace son créneau ; les conflits et dépassements de minuit sont refusés.
- Le report décale au lendemain de l’échéance, ou à demain si la tâche est en retard ou sans date. Son créneau lié suit le report si l’horaire est libre.
- Le message **Annuler** restaure la dernière validation, le report ou la planification proposés par ces raccourcis. La validation d’une tâche planifiée met également à jour son événement.
- Sur téléphone, l’agenda hebdomadaire devient une liste par jour. Les validations et les modales restent accessibles au clavier.
- L’indicateur personnel (ancien score de vie) est masqué par défaut. Activez-le dans **Réglages → Progression personnelle** ; son calcul détaillé apparaît sur l’accueil et dans Statistiques.
- Les confettis sont réservés au premier objectif atteint depuis l’utilisation de l’app. Le marqueur est conservé dans la sauvegarde ; les objectifs déjà atteints au chargement ne sont pas célébrés. Le réglage système de réduction des animations est respecté.

## Déploiement sur Vercel

Le dépôt contient déjà `vercel.json` (framework Vite, build `npm run build`, sortie `dist`,
réécritures SPA). Deux options :

**Depuis l'interface Vercel** — « Add New… → Project », importez ce dépôt, laissez les réglages
détectés automatiquement, puis « Deploy ». Aucune variable d'environnement n'est nécessaire.

**Depuis le terminal :**

```bash
npm i -g vercel
vercel        # déploiement de prévisualisation
vercel --prod # mise en production
```

## Données

À la première ouverture, un jeu de **données de démonstration** sur 12 mois est chargé pour que
tous les écrans soient parlants. Pour repartir de zéro : *Réglages → Tout effacer*.
Pour recharger la démo : *Réglages → Charger la démo*.

Les données restent dans le navigateur. Pensez à **exporter** (Réglages → Exporter) avant de
vider le cache ou pour passer d'un appareil à un autre.

## Architecture

```
src/
  types.ts               modèle de données (comptes, opérations, événements, habitudes…)
  lib/                   dates, formats, identifiants, domaines de vie
  store/
    store.tsx            état global + persistance localStorage (CRUD générique)
    seed.ts              jeu de démonstration déterministe sur 12 mois
    recurring.ts         moteur d'échéances récurrentes (idempotent)
    selectors.ts         tous les calculs de tracking (soldes, budgets, séries, score de vie)
  components/
    ui/                  cartes, statistiques, modales, champs, icônes
    charts/              barres, courbes, anneau, barres horizontales, carte de densité
    forms/               formulaires opération / événement / tâche
    layout/              navigation latérale et mobile
  pages/                 un fichier par module
```

Pile technique : React 19, TypeScript strict, Vite 6. Aucune dépendance d'exécution
en dehors de React.
