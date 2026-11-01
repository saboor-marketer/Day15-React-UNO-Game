import type { Card, CardColor, Color, Kind } from "./types";

export const COLORS: Color[] = ["red", "yellow", "green", "blue"];

export const COLOR_HEX: Record<CardColor, string> = {
  red: "#ff3b3b",
  yellow: "#ffcc1f",
  green: "#2fd36a",
  blue: "#2f8cff",
  wild: "#1b1b22",
};

export const COLOR_LABEL: Record<Color, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
};

let nextId = 1;

export function createDeck(): Card[] {
  const cards: Card[] = [];
  const push = (color: CardColor, kind: Kind, value = -1) =>
    cards.push({ id: nextId++, color, kind, value });

  for (const color of COLORS) {
    push(color, "number", 0);
    for (let v = 1; v <= 9; v++) {
      push(color, "number", v);
      push(color, "number", v);
    }
    for (let i = 0; i < 2; i++) {
      push(color, "skip");
      push(color, "reverse");
      push(color, "draw2");
    }
  }
  for (let i = 0; i < 4; i++) {
    push("wild", "wild");
    push("wild", "wild4");
  }
  return shuffle(cards);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Classic UNO point value (used for round-win bonus). */
export function classicPoints(card: Card): number {
  if (card.kind === "number") return card.value;
  if (card.kind === "wild" || card.kind === "wild4") return 50;
  return 20;
}

/** Arcade base points for playing a card. */
export function playPoints(card: Card): number {
  switch (card.kind) {
    case "number":
      return 5 + card.value;
    case "skip":
    case "reverse":
    case "draw2":
      return 20;
    case "wild":
      return 30;
    case "wild4":
      return 50;
  }
}

export function canPlay(card: Card, top: Card, currentColor: Color): boolean {
  if (card.color === "wild") return true;
  if (card.color === currentColor) return true;
  if (card.kind === "number" && top.kind === "number" && card.value === top.value) return true;
  if (card.kind !== "number" && card.kind === top.kind) return true;
  return false;
}

const COLOR_ORDER: Record<CardColor, number> = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
const KIND_ORDER: Record<Kind, number> = { number: 0, skip: 1, reverse: 2, draw2: 3, wild: 4, wild4: 5 };

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    if (COLOR_ORDER[a.color] !== COLOR_ORDER[b.color]) return COLOR_ORDER[a.color] - COLOR_ORDER[b.color];
    if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return a.value - b.value;
  });
}

export function cardLabel(card: Card): string {
  switch (card.kind) {
    case "number":
      return String(card.value);
    case "skip":
      return "Skip";
    case "reverse":
      return "Reverse";
    case "draw2":
      return "+2";
    case "wild":
      return "Wild";
    case "wild4":
      return "Wild +4";
  }
}

/** Deterministic pseudo-random rotation for pile cards. */
export function cardTilt(id: number): number {
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return ((x - Math.floor(x)) - 0.5) * 24;
}
