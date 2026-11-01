export type Color = "red" | "yellow" | "green" | "blue";
export type CardColor = Color | "wild";
export type Kind = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export interface Card {
  id: number;
  color: CardColor;
  kind: Kind;
  /** 0-9 for number cards, -1 otherwise */
  value: number;
}

export interface Player {
  id: number;
  name: string;
  emoji: string;
  hand: Card[];
  human: boolean;
  calledUno: boolean;
}

export type Phase = "menu" | "playing" | "paused" | "roundover" | "gameover";

export type SoundName =
  | "play"
  | "draw"
  | "uno"
  | "win"
  | "lose"
  | "click"
  | "error"
  | "hit"
  | "skip"
  | "reverse"
  | "combo"
  | "catch";

export type FloatAnchor = "pile" | "center" | "score" | number;

export type Fx =
  | { type: "play"; player: number; card: Card }
  | { type: "draw"; player: number; count: number; penalty?: boolean }
  | { type: "float"; text: string; at: FloatAnchor; color?: string; size?: "sm" | "md" | "lg"; delay?: number }
  | { type: "shake"; power: number }
  | { type: "sound"; name: SoundName; delay?: number }
  | { type: "uno"; player: number }
  | { type: "win" }
  | { type: "lose" };

export interface UnoWindow {
  player: number;
  deadline: number;
  remaining?: number;
}

export interface RoundSummary {
  winBonus: number;
  cardBonus: number;
  comboBonus: number;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  deck: Card[];
  discard: Card[];
  currentColor: Color;
  turn: number;
  direction: 1 | -1;
  pendingWild: boolean;
  drawnCardId: number | null;
  lastPlayedBy: number;
  score: number;
  round: number;
  combo: number;
  bestCombo: number;
  turnStartedAt: number;
  unoWindow: UnoWindow | null;
  winner: number | null;
  roundSummary: RoundSummary | null;
  moves: number;
  cardsPlayed: number;
  fx: Fx[];
  message: string;
}

export type Action =
  | { type: "NEW_GAME"; now: number }
  | { type: "NEXT_ROUND"; now: number }
  | { type: "PLAY"; player: number; cardId: number; color?: Color; now: number }
  | { type: "CHOOSE_COLOR"; color: Color; now: number }
  | { type: "DRAW"; player: number; now: number }
  | { type: "PASS"; player: number; now: number }
  | { type: "BOT_MOVE"; now: number }
  | { type: "CALL_UNO"; now: number }
  | { type: "CATCH"; target: number; now: number }
  | { type: "UNO_TIMEOUT"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "MENU" };
