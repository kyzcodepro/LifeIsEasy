import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ title, onClose, onSubmit, submitLabel = 'Enregistrer', children, footer, wide }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const focusable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []);
    (dialog.current?.querySelector<HTMLElement>('[autofocus], input, select, textarea') ?? focusable()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      else document.getElementById('main-content')?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} className="modal" style={wide ? { width: 'min(760px, 100%)' } : undefined} role="dialog" aria-modal="true" aria-label={title}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
        >
          <div className="modal-head">
            <h2>{title}</h2>
            <div className="spacer" />
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fermer">
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-foot">
            {footer}
            <button type="button" className="btn" onClick={onClose}>
              Annuler
            </button>
            {onSubmit && (
              <button type="submit" className="btn btn-primary">
                {submitLabel}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
