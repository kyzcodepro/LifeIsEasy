import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { createSpeechSession, speechSupported } from '../../lib/speech';
import type { SpeechSession } from '../../lib/speech';

interface Props {
  lang: string;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onListeningChange?: (listening: boolean) => void;
}

/**
 * Bouton de dictée. Ne s'affiche pas si le navigateur ne sait pas reconnaître
 * la parole : mieux vaut l'absence de bouton qu'un bouton qui échoue.
 */
export function MicButton({ lang, onPartial, onFinal, onError, onListeningChange }: Props) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => speechSupported());
  const session = useRef<SpeechSession | null>(null);

  // Les rappels changent à chaque rendu : on lit toujours la version courante.
  const callbacks = useRef({ onPartial, onFinal, onError, onListeningChange });
  callbacks.current = { onPartial, onFinal, onError, onListeningChange };

  useEffect(() => () => session.current?.stop(), []);

  if (!supported) return null;

  const setState = (value: boolean) => {
    setListening(value);
    callbacks.current.onListeningChange?.(value);
  };

  const stop = () => {
    session.current?.stop();
    session.current = null;
    setState(false);
  };

  const start = () => {
    const next = createSpeechSession(lang, {
      onPartial: (text) => callbacks.current.onPartial(text),
      onFinal: (text) => callbacks.current.onFinal(text),
      onError: (message) => {
        callbacks.current.onError(message);
        session.current = null;
        setState(false);
      },
      onEnd: () => {
        session.current = null;
        setState(false);
      },
    });
    if (!next) return;
    session.current = next;
    setState(true);
    next.start();
  };

  return (
    <button
      type="button"
      className={`btn btn-icon mic-btn${listening ? ' listening' : ''}`}
      aria-pressed={listening}
      aria-label={listening ? 'Arrêter la dictée' : 'Dicter votre phrase'}
      title={listening ? 'Arrêter la dictée' : 'Dicter votre phrase'}
      onClick={() => (listening ? stop() : start())}
    >
      <Icon name="mic" size={17} />
    </button>
  );
}
