import { useEffect } from 'react';
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { width: 'min(760px, 100%)' } : undefined} role="dialog" aria-modal="true" aria-label={title}>
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
