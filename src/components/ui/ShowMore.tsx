import { useEffect, useState } from 'react';

/**
 * Limite l'affichage d'une longue liste. Déverser quarante lignes oblige à
 * faire défiler avant de comprendre ; dix lignes et un bouton laissent le
 * choix. La limite se réinitialise quand le jeu de données change (mois,
 * filtre), sinon « tout afficher » resterait actif d'une sélection à l'autre.
 */
export function useRowLimit(total: number, step = 10) {
  const [limit, setLimit] = useState(step);

  useEffect(() => {
    setLimit(step);
  }, [total, step]);

  return {
    limit,
    hidden: Math.max(0, total - limit),
    expanded: total > step && limit >= total,
    showAll: () => setLimit(total),
    collapse: () => setLimit(step),
  };
}

export function ShowMore({
  hidden,
  expanded,
  total,
  noun,
  onShowAll,
  onCollapse,
}: {
  hidden: number;
  expanded: boolean;
  total: number;
  /** Nom au pluriel : « opérations », « séances »… */
  noun: string;
  onShowAll: () => void;
  onCollapse: () => void;
}) {
  if (!hidden && !expanded) return null;
  return (
    <div className="show-more">
      {hidden > 0 ? (
        <button type="button" className="btn btn-sm" onClick={onShowAll}>
          Afficher les {total} {noun}
        </button>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCollapse}>
          Réduire la liste
        </button>
      )}
    </div>
  );
}
