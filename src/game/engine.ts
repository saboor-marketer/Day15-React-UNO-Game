import { COLORS, canPlay, classicPoints, createDeck, playPoints, shuffle, sortHand } from "./deck";
import type { Action, Card, Color, GameState, Player } from "./types";

export const HUMAN = 0;
export const UNO_WINDOW_MS = 2200;
export const QUICK_MS = 2500;
export const MAX_MULT = 5;

const BOTS: { name: string; emoji: string }[] = [
  { name: "Nova", emoji: "🤖" },
  { name: "Rex", emoji: "🦖" },
  { name: "Luna", emoji: "🐱" },
];

export function initialState(): GameState {
  return {
    phase: "menu",
    players: [],
    deck: [],
    discard: [],
    currentColor: "red",
    turn: 0,
    direction: 1,
    pendingWild: false,
    drawnCardId: null,
    lastPlayedBy: -1,
    score: 0,
    round: 1,
    combo: 0,
    bestCombo: 0,
    turnStartedAt: 0,
    unoWindow: null,
    winner: null,
    roundSummary: null,
    moves: 0,
    cardsPlayed: 0,
    fx: [],
    message: "",
  };
}

type Draft = GameState;

function clone(s: GameState): Draft {
  return {
    ...s,
    players: s.players.map((p) => ({ ...p, hand: [...p.hand] })),
    deck: [...s.deck],
    discard: [...s.discard],
    fx: [],
    moves: s.moves + 1,
  };
}

export function multiplier(combo: number): number {
  return Math.min(1 + combo, MAX_MULT);
}

export function nextIndex(s: GameState, from: number, steps = 1): number {
  const n = s.players.length;
  return (((from + s.direction * steps) % n) + n) % n;
}

export function topCard(s: GameState): Card {
  return s.discard[s.discard.length - 1];
}

export function playableCards(s: GameState, playerIdx: number): Card[] {
  const p = s.players[playerIdx];
  if (!p || s.discard.length === 0) return [];
  const top = topCard(s);
  const cards = p.hand.filter((c) => canPlay(c, top, s.currentColor));
  if (s.drawnCardId !== null && playerIdx === s.turn) {
    return cards.filter((c) => c.id === s.drawnCardId);
  }
  return cards;
}

function takeCard(s: Draft): Card | null {
  if (s.deck.length === 0) {
    if (s.discard.length <= 1) return null;
    const top = s.discard.pop()!;
    s.deck = shuffle(s.discard);
    s.discard = [top];
  }
  return s.deck.pop() ?? null;
}

function giveCards(s: Draft, playerIdx: number, count: number): number {
  const p = s.players[playerIdx];
  let given = 0;
  for (let i = 0; i < count; i++) {
    const c = takeCard(s);
    if (!c) break;
    p.hand.push(c);
    given++;
  }
  if (p.human) p.hand = sortHand(p.hand);
  if (p.hand.length > 1) p.calledUno = false;
  return given;
}

function setupRound(s: Draft, now: number) {
  s.deck = createDeck();
  s.discard = [];
  s.players = [
    { id: 0, name: "You", emoji: "😎", hand: [], human: true, calledUno: false },
    ...BOTS.map((b, i) => ({ id: i + 1, name: b.name, emoji: b.emoji, hand: [], human: false, calledUno: false })),
  ];
  for (let i = 0; i < 7; i++) {
    for (let p = 0; p < s.players.length; p++) giveCards(s, p, 1);
  }
  // first discard: must be a number card
  let first = takeCard(s)!;
  while (first.kind !== "number") {
    s.deck.unshift(first);
    first = takeCard(s)!;
  }
  s.discard.push(first);
  s.currentColor = first.color as Color;
  s.turn = HUMAN;
  s.direction = 1;
  s.pendingWild = false;
  s.drawnCardId = null;
  s.lastPlayedBy = -1;
  s.combo = 0;
  s.turnStartedAt = now + 900;
  s.unoWindow = null;
  s.winner = null;
  s.roundSummary = null;
  s.phase = "playing";
  s.message = "Your turn — play a card!";
}

function addScore(s: Draft, amount: number) {
  s.score += amount;
}

function startTurn(s: Draft, idx: number, now: number) {
  s.turn = idx;
  s.turnStartedAt = now;
  s.drawnCardId = null;
  const p = s.players[idx];
  s.message = p.human ? "Your turn — play a card!" : `${p.name} is thinking…`;
}

function finishRound(s: Draft, winnerIdx: number) {
  s.winner = winnerIdx;
  s.unoWindow = null;
  s.pendingWild = false;
  if (winnerIdx === HUMAN) {
    const cardBonus = s.players.filter((p) => !p.human).reduce((sum, p) => sum + p.hand.reduce((a, c) => a + classicPoints(c), 0), 0);
    const winBonus = 150 * s.round;
    const comboBonus = s.bestCombo * 20;
    s.roundSummary = { winBonus, cardBonus, comboBonus };
    addScore(s, winBonus + cardBonus + comboBonus);
    s.phase = "roundover";
    s.message = "You cleared the round!";
    s.fx.push({ type: "win" });
  } else {
    s.phase = "gameover";
    s.message = `${s.players[winnerIdx].name} wins the round.`;
    s.fx.push({ type: "lose" });
  }
}

function placeCard(s: Draft, playerIdx: number, cardId: number, now: number): Card | null {
  const p = s.players[playerIdx];
  const i = p.hand.findIndex((c) => c.id === cardId);
  if (i < 0) return null;
  const [card] = p.hand.splice(i, 1);
  s.discard.push(card);
  s.lastPlayedBy = playerIdx;
  s.cardsPlayed++;
  s.fx.push({ type: "play", player: playerIdx, card });

  if (p.human) {
    const mult = multiplier(s.combo);
    const pts = playPoints(card) * mult;
    addScore(s, pts);
    const quick = now - s.turnStartedAt < QUICK_MS;
    s.fx.push({ type: "float", text: `+${pts}`, at: "pile", color: "#fff", size: mult > 1 ? "lg" : "md" });
    if (quick) {
      addScore(s, 15);
      s.fx.push({ type: "float", text: "QUICK +15", at: "pile", color: "#ffe066", size: "sm", delay: 220 });
    }
    s.combo++;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;
    if (s.combo >= 2) {
      s.fx.push({ type: "float", text: `COMBO ×${multiplier(s.combo)}`, at: "score", color: "#ff7ad9", size: "md", delay: 120 });
      s.fx.push({ type: "sound", name: "combo", delay: 90 });
    }
  }
  return card;
}

function applyEffects(s: Draft, playerIdx: number, card: Card, color: Color, now: number) {
  s.currentColor = color;
  const p = s.players[playerIdx];

  if (p.hand.length === 0) {
    finishRound(s, playerIdx);
    return;
  }

  // UNO handling
  if (p.hand.length === 1) {
    if (p.human) {
      if (p.calledUno) {
        // called ahead of time
      } else {
        s.unoWindow = { player: playerIdx, deadline: now + UNO_WINDOW_MS };
      }
    } else {
      const callChance = Math.min(0.6 + s.round * 0.08, 0.92);
      if (Math.random() < callChance) {
        p.calledUno = true;
        s.fx.push({ type: "uno", player: playerIdx });
      } else {
        s.unoWindow = { player: playerIdx, deadline: now + UNO_WINDOW_MS + 600 };
      }
    }
  }

  let steps = 1;
  const next = nextIndex(s, playerIdx, 1);
  switch (card.kind) {
    case "skip":
      steps = 2;
      s.fx.push({ type: "float", text: "SKIPPED", at: next, color: "#ffffff", size: "md" });
      s.fx.push({ type: "sound", name: "skip" });
      break;
    case "reverse":
      s.direction = s.direction === 1 ? -1 : 1;
      s.fx.push({ type: "float", text: "REVERSE", at: "center", color: "#ffffff", size: "md" });
      s.fx.push({ type: "sound", name: "reverse" });
      break;
    case "draw2":
    case "wild4": {
      const n = card.kind === "draw2" ? 2 : 4;
      const given = giveCards(s, next, n);
      steps = 2;
      s.fx.push({ type: "draw", player: next, count: given, penalty: true });
      s.fx.push({ type: "float", text: `+${given}`, at: next, color: "#ff5d5d", size: "lg" });
      s.fx.push({ type: "sound", name: "hit", delay: 150 });
      if (next === HUMAN) {
        s.fx.push({ type: "shake", power: n === 2 ? 8 : 14 });
        s.combo = 0;
      } else if (p.human) {
        addScore(s, given * 10);
        s.fx.push({ type: "float", text: `HIT +${given * 10}`, at: "score", color: "#ffe066", size: "sm", delay: 200 });
      }
      break;
    }
  }
  if (card.kind === "reverse" && s.players.length === 2) steps = 2;

  const nextTurn = nextIndex(s, playerIdx, steps);
  startTurn(s, nextTurn, now);
}

function botChooseColor(hand: Card[]): Color {
  const counts: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) if (c.color !== "wild") counts[c.color]++;
  let best: Color = COLORS[Math.floor(Math.random() * 4)];
  let bestN = -1;
  for (const c of COLORS) if (counts[c] > bestN) (bestN = counts[c]), (best = c);
  return best;
}

function botPick(s: Draft, idx: number): Card | null {
  const p = s.players[idx];
  const top = topCard(s);
  let playable = p.hand.filter((c) => canPlay(c, top, s.currentColor));
  if (s.drawnCardId !== null) playable = playable.filter((c) => c.id === s.drawnCardId);
  if (playable.length === 0) return null;
  const smart = Math.random() < Math.min(0.4 + s.round * 0.15, 0.95);
  if (!smart) return playable[Math.floor(Math.random() * playable.length)];

  const nextP = s.players[nextIndex(s, idx, 1)];
  const threat = nextP.hand.length <= 2;
  const colorCount = (col: string) => p.hand.filter((c) => c.color === col).length;
  const rank = (c: Card) => {
    let r = 0;
    if (threat) {
      if (c.kind === "wild4") r += 100;
      else if (c.kind === "draw2") r += 90;
      else if (c.kind === "skip") r += 80;
      else if (c.kind === "reverse") r += 60;
      else r += 30 + c.value;
    } else {
      if (c.kind === "number") r += 50 + c.value;
      else if (c.kind === "wild4") r += 5;
      else if (c.kind === "wild") r += 10;
      else r += 40;
    }
    if (c.color !== "wild") r += colorCount(c.color) * 3;
    return r + Math.random() * 4;
  };
  return [...playable].sort((a, b) => rank(b) - rank(a))[0];
}

function penalizeUno(s: Draft, target: number, catcher: string, now: number) {
  const given = giveCards(s, target, 2);
  s.fx.push({ type: "draw", player: target, count: given, penalty: true });
  s.fx.push({ type: "sound", name: "catch" });
  if (target === HUMAN) {
    s.combo = 0;
    s.fx.push({ type: "shake", power: 10 });
    s.fx.push({ type: "float", text: `${catcher} caught you! +2`, at: HUMAN, color: "#ff5d5d", size: "md" });
  } else {
    addScore(s, 100);
    s.fx.push({ type: "float", text: "CAUGHT! +100", at: target, color: "#ffe066", size: "lg" });
    s.fx.push({ type: "shake", power: 5 });
  }
  void now;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "NEW_GAME": {
      const s = clone(state);
      s.score = 0;
      s.round = 1;
      s.bestCombo = 0;
      s.cardsPlayed = 0;
      setupRound(s, action.now);
      return s;
    }
    case "NEXT_ROUND": {
      if (state.phase !== "roundover") return state;
      const s = clone(state);
      s.round++;
      setupRound(s, action.now);
      s.fx.push({ type: "float", text: `ROUND ${s.round}`, at: "center", color: "#fff", size: "lg" });
      return s;
    }
    case "MENU": {
      const s = clone(state);
      s.phase = "menu";
      s.unoWindow = null;
      return s;
    }
    case "PAUSE": {
      if (state.phase !== "playing") return state;
      const s = clone(state);
      s.phase = "paused";
      if (s.unoWindow) s.unoWindow = { ...s.unoWindow, remaining: Math.max(0, s.unoWindow.deadline - action.now) };
      return s;
    }
    case "RESUME": {
      if (state.phase !== "paused") return state;
      const s = clone(state);
      s.phase = "playing";
      s.turnStartedAt = action.now;
      if (s.unoWindow) s.unoWindow = { player: s.unoWindow.player, deadline: action.now + (s.unoWindow.remaining ?? 0) };
      return s;
    }
    case "PLAY": {
      if (state.phase !== "playing" || state.pendingWild) return state;
      if (action.player !== state.turn) return state;
      const player = state.players[action.player];
      const card = player.hand.find((c) => c.id === action.cardId);
      if (!card) return state;
      if (!canPlay(card, topCard(state), state.currentColor)) return state;
      if (state.drawnCardId !== null && card.id !== state.drawnCardId) return state;

      const s = clone(state);
      placeCard(s, action.player, action.cardId, action.now);
      if (card.color === "wild") {
        const remaining = s.players[action.player].hand.length;
        if (player.human && remaining > 0 && !action.color) {
          s.pendingWild = true;
          s.message = "Pick a color";
          return s;
        }
        const color = action.color ?? (remaining === 0 ? s.currentColor : botChooseColor(s.players[action.player].hand));
        applyEffects(s, action.player, card, color, action.now);
      } else {
        applyEffects(s, action.player, card, card.color as Color, action.now);
      }
      return s;
    }
    case "CHOOSE_COLOR": {
      if (state.phase !== "playing" || !state.pendingWild) return state;
      const s = clone(state);
      s.pendingWild = false;
      const card = topCard(s);
      s.fx.push({ type: "float", text: action.color.toUpperCase(), at: "pile", color: "#fff", size: "md" });
      applyEffects(s, HUMAN, card, action.color, action.now);
      return s;
    }
    case "DRAW": {
      if (state.phase !== "playing" || state.pendingWild) return state;
      if (action.player !== state.turn || state.drawnCardId !== null) return state;
      const s = clone(state);
      const p = s.players[action.player];
      const before = new Set(p.hand.map((c) => c.id));
      const given = giveCards(s, action.player, 1);
      if (given === 0) {
        startTurn(s, nextIndex(s, action.player, 1), action.now);
        return s;
      }
      const drawn = p.hand.find((c) => !before.has(c.id))!;
      s.fx.push({ type: "draw", player: action.player, count: 1 });
      if (p.human) {
        s.combo = 0;
      }
      if (canPlay(drawn, topCard(s), s.currentColor)) {
        s.drawnCardId = drawn.id;
        s.message = p.human ? "Play the drawn card or pass" : `${p.name} is thinking…`;
      } else {
        if (p.human) s.fx.push({ type: "float", text: "No match — pass", at: HUMAN, color: "#cbd5e1", size: "sm" });
        startTurn(s, nextIndex(s, action.player, 1), action.now);
      }
      return s;
    }
    case "PASS": {
      if (state.phase !== "playing" || state.pendingWild) return state;
      if (action.player !== state.turn || state.drawnCardId === null) return state;
      const s = clone(state);
      startTurn(s, nextIndex(s, action.player, 1), action.now);
      return s;
    }
    case "BOT_MOVE": {
      if (state.phase !== "playing" || state.pendingWild) return state;
      const idx = state.turn;
      const bot = state.players[idx];
      if (!bot || bot.human) return state;
      const s = clone(state);
      const pick = botPick(s, idx);
      if (pick) {
        placeCard(s, idx, pick.id, action.now);
        const color: Color = pick.color === "wild" ? botChooseColor(s.players[idx].hand) : (pick.color as Color);
        if (pick.color === "wild" && s.players[idx].hand.length > 0) {
          s.fx.push({ type: "float", text: color.toUpperCase(), at: "pile", color: "#fff", size: "md", delay: 300 });
        }
        applyEffects(s, idx, pick, color, action.now);
        return s;
      }
      if (s.drawnCardId !== null) {
        startTurn(s, nextIndex(s, idx, 1), action.now);
        return s;
      }
      // draw a card
      const before = new Set(bot.hand.map((c) => c.id));
      const given = giveCards(s, idx, 1);
      if (given === 0) {
        startTurn(s, nextIndex(s, idx, 1), action.now);
        return s;
      }
      s.fx.push({ type: "draw", player: idx, count: 1 });
      const drawn = s.players[idx].hand.find((c) => !before.has(c.id))!;
      if (canPlay(drawn, topCard(s), s.currentColor)) {
        s.drawnCardId = drawn.id; // will play it on next BOT_MOVE
      } else {
        startTurn(s, nextIndex(s, idx, 1), action.now);
      }
      return s;
    }
    case "CALL_UNO": {
      if (state.phase !== "playing") return state;
      const me = state.players[HUMAN];
      const s = clone(state);
      // Case 1: I have 1 card & window open -> safe
      if (s.unoWindow && s.unoWindow.player === HUMAN) {
        s.unoWindow = null;
        s.players[HUMAN].calledUno = true;
        addScore(s, 50);
        s.fx.push({ type: "uno", player: HUMAN });
        s.fx.push({ type: "float", text: "+50", at: "score", color: "#ffe066", size: "md", delay: 150 });
        return s;
      }
      // Case 2: pre-call with 2 cards on my turn
      if (me.hand.length === 2 && !me.calledUno) {
        s.players[HUMAN].calledUno = true;
        addScore(s, 50);
        s.fx.push({ type: "uno", player: HUMAN });
        s.fx.push({ type: "float", text: "+50", at: "score", color: "#ffe066", size: "md", delay: 150 });
        return s;
      }
      // Case 3: catch a bot that forgot
      if (s.unoWindow && s.unoWindow.player !== HUMAN) {
        const target = s.unoWindow.player;
        s.unoWindow = null;
        penalizeUno(s, target, "You", action.now);
        return s;
      }
      // Misfire
      s.fx.push({ type: "sound", name: "error" });
      s.fx.push({ type: "float", text: "Not now!", at: HUMAN, color: "#cbd5e1", size: "sm" });
      return s;
    }
    case "CATCH": {
      if (state.phase !== "playing" || !state.unoWindow || state.unoWindow.player !== action.target) return state;
      const s = clone(state);
      s.unoWindow = null;
      penalizeUno(s, action.target, "You", action.now);
      return s;
    }
    case "UNO_TIMEOUT": {
      if (state.phase !== "playing" || !state.unoWindow) return state;
      const s = clone(state);
      const target = state.unoWindow.player;
      s.unoWindow = null;
      if (target === HUMAN) {
        const bots = s.players.filter((p) => !p.human);
        const catcher = bots[Math.floor(Math.random() * bots.length)];
        penalizeUno(s, HUMAN, catcher.name, action.now);
      } else {
        // bot got away with it; mark as called so no double-dipping
        s.players[target].calledUno = true;
      }
      return s;
    }
    default:
      return state;
  }
}

export function humanPlayer(s: GameState): Player | undefined {
  return s.players[HUMAN];
}
