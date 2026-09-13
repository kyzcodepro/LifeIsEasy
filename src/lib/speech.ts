/**
 * Dictée vocale via l'API Web Speech, intégrée aux navigateurs (Chrome, Edge,
 * Safari). Aucune clé, aucun service tiers à installer.
 *
 * Réserve à connaître : la reconnaissance elle-même est assurée par le
 * navigateur, et selon celui-ci l'audio peut transiter par son service en ligne
 * (c'est le cas de Chrome). Le texte obtenu, lui, est analysé sur l'appareil
 * comme le reste de l'application. L'interface le dit explicitement.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): RecognitionAlternative;
  [index: number]: RecognitionAlternative;
}
interface RecognitionResultList {
  readonly length: number;
  item(index: number): RecognitionResult;
  [index: number]: RecognitionResult;
}
interface RecognitionEventLike {
  readonly resultIndex: number;
  readonly results: RecognitionResultList;
}
interface RecognitionErrorLike {
  readonly error: string;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type RecognitionConstructor = new () => RecognitionLike;

interface SpeechWindow {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}

function constructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** La dictée est-elle disponible dans ce navigateur ? */
export function speechSupported(): boolean {
  return constructor() !== null;
}

/** Messages d'erreur en clair — l'utilisateur doit savoir quoi faire. */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Micro refusé. Autorisez l’accès au microphone dans les réglages du navigateur, puis réessayez.';
    case 'audio-capture':
      return 'Aucun micro détecté. Vérifiez qu’un microphone est branché et disponible.';
    case 'no-speech':
      return 'Je n’ai rien entendu. Réessayez en parlant juste après avoir lancé la dictée.';
    case 'network':
      return 'La reconnaissance vocale du navigateur est injoignable (connexion requise pour ce navigateur).';
    case 'aborted':
      return 'Dictée interrompue.';
    default:
      return 'La dictée s’est arrêtée : réessayez, ou tapez votre phrase.';
  }
}

export interface SpeechHandlers {
  /** Texte provisoire, mis à jour pendant que l'on parle. */
  onPartial: (text: string) => void;
  /** Texte définitif d'une phrase. */
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

export interface SpeechSession {
  start: () => void;
  stop: () => void;
}

/**
 * Prépare une session de dictée. Renvoie `null` si le navigateur ne sait pas
 * faire — l'appelant masque alors le bouton plutôt que d'afficher une erreur.
 */
export function createSpeechSession(lang: string, handlers: SpeechHandlers): SpeechSession | null {
  const Ctor = constructor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = lang || 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let partial = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? '';
      if (result.isFinal) {
        const trimmed = text.trim();
        if (trimmed) handlers.onFinal(trimmed);
      } else {
        partial += text;
      }
    }
    if (partial.trim()) handlers.onPartial(partial.trim());
  };
  recognition.onerror = (event) => handlers.onError(speechErrorMessage(event.error));
  recognition.onend = () => handlers.onEnd();

  return {
    start: () => {
      try {
        recognition.start();
      } catch {
        // start() lève si une session est déjà en cours : on ignore, l'état UI suit onend.
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        /* rien à faire : la session était déjà terminée */
      }
    },
  };
}
