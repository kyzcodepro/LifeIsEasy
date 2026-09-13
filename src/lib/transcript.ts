/**
 * Fil de conversation de l'assistant, conservé hors du cycle de vie de la page :
 * on peut ouvrir une autre rubrique depuis une réponse et revenir sans perdre
 * l'historique — ni les boutons « Annuler », dont les fermetures restent valides
 * (les actions du store sont stables d'un rendu à l'autre).
 */
export interface ChatCreated {
  title: string;
  chips: string[];
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  details?: string[];
  created?: ChatCreated[];
  undo?: () => void;
  route?: string;
  routeLabel?: string;
}

let transcript: ChatMessage[] = [];

export function getTranscript(): ChatMessage[] {
  return transcript;
}

export function setTranscript(next: ChatMessage[]): void {
  transcript = next;
}

export function clearTranscript(): void {
  transcript = [];
}
