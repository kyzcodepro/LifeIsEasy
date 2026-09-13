import { useCallback, useEffect, useRef, useState } from 'react';

/** Largeur observée d'un conteneur : les SVG se redimensionnent sans déformation. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 640);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Couleur d'un slot catégoriel (1..8), ordre fixe, jamais recyclé au-delà de 8. */
export function slotColor(slot: number): string {
  const s = ((slot - 1) % 8) + 1;
  return `var(--s${s})`;
}

export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  return ticks;
}

export function useTooltip<T>() {
  const [tip, setTip] = useState<{ x: number; y: number; data: T } | null>(null);
  const show = useCallback((x: number, y: number, data: T) => setTip({ x, y, data }), []);
  const hide = useCallback(() => setTip(null), []);
  return { tip, show, hide };
}
