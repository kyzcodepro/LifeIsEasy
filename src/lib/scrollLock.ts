import { useEffect } from 'react';

/**
 * Verrouillage du défilement pendant qu'une surface se superpose à la page
 * (feuille de navigation, modale).
 *
 * `overflow: hidden` sur le corps ne suffit pas : sur iOS le geste tactile
 * continue de faire défiler la page derrière. On fige donc le corps en
 * `position: fixed` décalé de la position courante, puis on la restitue —
 * sinon rouvrir la page la ramènerait ailleurs qu'où on l'avait laissée.
 */
let locks = 0;
let savedY = 0;

export function lockScroll(): void {
  if (typeof document === 'undefined') return;
  if (locks++ > 0) return;
  savedY = window.scrollY;
  const { body } = document;
  // Compense la disparition de la barre de défilement pour éviter un saut latéral.
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  body.style.position = 'fixed';
  body.style.top = `-${savedY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (gutter > 0) body.style.paddingRight = `${gutter}px`;
}

export function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  const { body } = document;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflow = '';
  body.style.paddingRight = '';
  window.scrollTo(0, savedY);
}

/**
 * À appeler juste avant une navigation déclenchée depuis une surface
 * verrouillée : la nouvelle page s'ouvre en haut, il ne faut pas y rejouer la
 * position de l'ancienne.
 */
export function forgetScrollPosition(): void {
  savedY = 0;
}

/** Réservé aux tests : remet le compteur de verrous à zéro. */
export function resetScrollLock(): void {
  locks = 0;
  savedY = 0;
}

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lockScroll();
    return unlockScroll;
  }, [active]);
}
