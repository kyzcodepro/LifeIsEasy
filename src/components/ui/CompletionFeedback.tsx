import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from './Icon';

export function CompletionFeedback({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="completion-feedback" role="status">
      <span className="completion-icon"><Icon name="check" size={20} /></span>
      <span><strong>Objectif atteint !</strong><span>{message}</span></span>
      <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fermer la confirmation">×</button>
      <span className="celebration" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}
      </span>
    </div>
  );
}
