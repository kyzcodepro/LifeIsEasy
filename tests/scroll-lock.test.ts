import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forgetScrollPosition, lockScroll, resetScrollLock, unlockScroll } from '../src/lib/scrollLock';

/** Faux document : on n'observe que ce que le verrou écrit sur le corps. */
function installDom({ scrollY = 0, gutter = 0 } = {}) {
  const body = { style: {} as Record<string, string> };
  const scrolls: Array<[number, number]> = [];
  const previous = {
    document: (globalThis as Record<string, unknown>).document,
    window: (globalThis as Record<string, unknown>).window,
  };
  (globalThis as Record<string, unknown>).document = {
    body,
    documentElement: { clientWidth: 1000 - gutter },
  };
  (globalThis as Record<string, unknown>).window = {
    scrollY,
    innerWidth: 1000,
    scrollTo: (x: number, y: number) => scrolls.push([x, y]),
  };
  return {
    body,
    scrolls,
    restore: () => {
      resetScrollLock();
      for (const key of ['document', 'window'] as const) {
        if (previous[key] === undefined) delete (globalThis as Record<string, unknown>)[key];
        else (globalThis as Record<string, unknown>)[key] = previous[key];
      }
    },
  };
}

test('Le corps est figé à la position courante, puis rendu tel quel', () => {
  const dom = installDom({ scrollY: 900 });
  try {
    lockScroll();
    assert.equal(dom.body.style.position, 'fixed');
    assert.equal(dom.body.style.top, '-900px');
    assert.equal(dom.body.style.overflow, 'hidden');

    unlockScroll();
    assert.equal(dom.body.style.position, '');
    assert.equal(dom.body.style.top, '');
    assert.equal(dom.body.style.overflow, '');
    // La page revient exactement où l'utilisateur l'avait laissée.
    assert.deepEqual(dom.scrolls, [[0, 900]]);
  } finally {
    dom.restore();
  }
});

test('La barre de défilement est compensée pour éviter un saut latéral', () => {
  const dom = installDom({ scrollY: 0, gutter: 15 });
  try {
    lockScroll();
    assert.equal(dom.body.style.paddingRight, '15px');
    unlockScroll();
    assert.equal(dom.body.style.paddingRight, '');
  } finally {
    dom.restore();
  }
});

test('Deux surfaces superposées : seule la dernière fermeture libère la page', () => {
  const dom = installDom({ scrollY: 400 });
  try {
    lockScroll(); // feuille de navigation
    lockScroll(); // modale ouverte par-dessus
    unlockScroll();
    assert.equal(dom.body.style.position, 'fixed', 'la page reste figée tant qu’une surface est ouverte');
    assert.deepEqual(dom.scrolls, []);
    unlockScroll();
    assert.equal(dom.body.style.position, '');
    assert.deepEqual(dom.scrolls, [[0, 400]]);
  } finally {
    dom.restore();
  }
});

test('Une navigation depuis la surface ouvre la page suivante en haut', () => {
  const dom = installDom({ scrollY: 900 });
  try {
    lockScroll();
    forgetScrollPosition(); // ce que fait la feuille avant de changer de rubrique
    unlockScroll();
    assert.deepEqual(dom.scrolls, [[0, 0]], 'aucune position d’une autre page n’est rejouée');
  } finally {
    dom.restore();
  }
});

test('Une fermeture en trop ne déverrouille pas la page à contretemps', () => {
  const dom = installDom({ scrollY: 200 });
  try {
    unlockScroll(); // fermeture parasite, sans ouverture
    lockScroll();
    assert.equal(dom.body.style.position, 'fixed');
    unlockScroll();
    assert.equal(dom.body.style.position, '');
  } finally {
    dom.restore();
  }
});
