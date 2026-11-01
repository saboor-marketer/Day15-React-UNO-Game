import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { FlyLayer, FloatLayer, type FlyHandle, type FloatHandle } from "./components/FxLayers";
import { Hand } from "./components/Hand";
import { Opponent } from "./components/Opponent";
import { ColorPicker, GameOverScreen, Key, PauseScreen, RoundOverScreen, StartScreen } from "./components/Overlays";
import { Table } from "./components/Table";
import { particles } from "./fx/particles";
import { sfx } from "./fx/sfx";
import { pulseElement, shakeElement, wiggleElement } from "./fx/shake";
import { COLOR_HEX } from "./game/deck";
import { HUMAN, initialState, multiplier, playableCards, reducer } from "./game/engine";
import { loadHighScores, loadName, qualifies, saveHighScore, saveName, type HighScore } from "./game/highscores";
import type { Card, Color, FloatAnchor } from "./game/types";
import { cn } from "./utils/cn";

const COLOR_KEYS: Record<string, Color> = { "1": "red", "2": "yellow", "3": "green", "4": "blue", r: "red", y: "yellow", g: "green", b: "blue" };

function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const from = ref.current;
    if (from === value) return;
    const start = performance.now();
    const dur = 450;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(from + (value - from) * e);
      setShown(v);
      ref.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [selected, setSelected] = useState(0);
  const [muted, setMuted] = useState(sfx.muted);
  const [scores, setScores] = useState<HighScore[]>(() => loadHighScores());
  const [savedDate, setSavedDate] = useState<number | undefined>(undefined);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [playerName, setPlayerName] = useState(() => loadName());

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flyRef = useRef<FlyHandle>(null);
  const floatRef = useRef<FloatHandle>(null);
  const anchors = useRef(new Map<string, HTMLElement>());
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const lastPlayRect = useRef<DOMRect | null>(null);

  const setAnchor = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) anchors.current.set(key, el);
      else anchors.current.delete(key);
    },
    [],
  );
  const rectOf = useCallback((key: string): DOMRect | null => anchors.current.get(key)?.getBoundingClientRect() ?? null, []);
  const anchorKey = (at: FloatAnchor) => (typeof at === "number" ? (at === HUMAN ? "hand" : `bot${at}`) : at);

  const { phase, players, turn, pendingWild, drawnCardId, unoWindow } = state;
  const me = players[HUMAN];
  const myTurn = phase === "playing" && turn === HUMAN && !pendingWild;
  const playable = useMemo(() => (phase === "playing" ? playableCards(state, HUMAN) : []), [state, phase]);
  const playableIds = useMemo(() => new Set(playable.map((c) => c.id)), [playable]);
  const mustDraw = myTurn && playable.length === 0 && drawnCardId === null;
  const shownScore = useCountUp(state.score);
  const mult = multiplier(state.combo);

  const now = () => Date.now();

  /* ---------- particles canvas ---------- */
  useEffect(() => {
    if (canvasRef.current) particles.attach(canvasRef.current);
    return () => particles.detach();
  }, []);

  /* ---------- tint ---------- */
  useEffect(() => {
    document.documentElement.style.setProperty("--tint", phase === "menu" ? "#2f8cff" : COLOR_HEX[state.currentColor]);
  }, [state.currentColor, phase]);

  /* ---------- select first playable at turn start ---------- */
  useEffect(() => {
    if (!myTurn || !me) return;
    const idx = me.hand.findIndex((c) => playableIds.has(c.id));
    setSelected(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn, state.moves]);

  /* ---------- bot turns ---------- */
  const turnKey = `${turn}|${drawnCardId}|${state.turnStartedAt}|${state.round}`;
  useEffect(() => {
    if (phase !== "playing" || pendingWild) return;
    const bot = players[turn];
    if (!bot || bot.human) return;
    const base = Math.max(480, 950 - state.round * 60);
    const delay = drawnCardId !== null ? 550 : base + Math.random() * 350;
    const t = window.setTimeout(() => dispatch({ type: "BOT_MOVE", now: now() }), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pendingWild, turnKey]);

  /* ---------- UNO window expiry ---------- */
  useEffect(() => {
    if (phase !== "playing" || !unoWindow) return;
    const ms = Math.max(0, unoWindow.deadline - now());
    const t = window.setTimeout(() => dispatch({ type: "UNO_TIMEOUT", now: now() }), ms);
    return () => clearTimeout(t);
  }, [phase, unoWindow]);

  /* ---------- pause on tab hide ---------- */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) dispatch({ type: "PAUSE", now: now() });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ---------- high score bookkeeping on game over ---------- */
  useEffect(() => {
    if (phase === "gameover") {
      setScoreSaved(false);
      setSavedDate(undefined);
    }
  }, [phase]);

  /* ---------- let the final card land before showing end screens ---------- */
  const [showEnd, setShowEnd] = useState(false);
  useEffect(() => {
    if (phase !== "gameover" && phase !== "roundover") {
      setShowEnd(false);
      return;
    }
    const t = window.setTimeout(() => setShowEnd(true), 750);
    return () => clearTimeout(t);
  }, [phase]);

  /* ---------- FX processing ---------- */
  useEffect(() => {
    if (state.fx.length === 0) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => (ms > 0 ? timers.push(window.setTimeout(fn, ms)) : fn());
    const center = (r: DOMRect | null) => (r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 });

    for (const f of state.fx) {
      switch (f.type) {
        case "play": {
          const pile = rectOf("pile");
          const hex = COLOR_HEX[f.card.color];
          const colors = f.card.color === "wild" ? ["#ff3b3b", "#ffcc1f", "#2fd36a", "#2f8cff"] : [hex, "#ffffff"];
          if (f.player !== HUMAN) {
            const from = rectOf(`bot${f.player}`);
            if (from && pile) flyRef.current?.fly({ from, to: pile, card: f.card, faceDown: false, duration: 320, delay: 0 });
            sfx.play("play");
            later(() => {
              const c = center(pile);
              particles.burst(c.x, c.y, colors, 16, { speed: 260, size: 6 });
            }, 300);
          } else {
            const from = lastPlayRect.current;
            lastPlayRect.current = null;
            if (from && pile) flyRef.current?.fly({ from, to: pile, card: f.card, faceDown: false, duration: 200, delay: 0 });
            sfx.play("play");
            later(() => {
              const c = center(pile);
              particles.burst(c.x, c.y, colors, 30 + Math.min(state.combo, 5) * 6, { speed: 340 });
              pulseElement(anchors.current.get("pile") ?? null, 1.06, 180);
            }, 170);
          }
          break;
        }
        case "draw": {
          const deck = rectOf("deck");
          const to = rectOf(anchorKey(f.player));
          const count = Math.min(f.count, 6);
          for (let i = 0; i < count; i++) {
            if (deck && to) flyRef.current?.fly({ from: deck, to, faceDown: true, duration: 320, delay: i * 90 });
            later(() => sfx.play("draw"), i * 90);
          }
          if (f.penalty) {
            later(() => {
              const c = center(to);
              particles.burst(c.x, c.y, ["#ff3b3b", "#ffffff"], 20, { speed: 240 });
            }, 320);
          }
          break;
        }
        case "float": {
          const key = anchorKey(f.at);
          later(() => {
            const r = key === "center" ? rectOf("pile") : rectOf(key);
            const c = center(r);
            if (key === "center" && r) c.x -= r.width * 0.85;
            floatRef.current?.spawn(c.x, c.y - (key === "hand" ? 40 : 10), f.text, f.color, f.size);
          }, f.delay ?? 0);
          break;
        }
        case "shake":
          shakeElement(rootRef.current, f.power);
          break;
        case "sound":
          later(() => sfx.play(f.name), f.delay ?? 0);
          break;
        case "uno": {
          const key = anchorKey(f.player);
          const r = rectOf(key);
          const c = center(r);
          sfx.play("uno");
          floatRef.current?.spawn(c.x, c.y - 50, "UNO!", "#ffe066", "lg");
          particles.ring(c.x, c.y, "#ffe066", 28);
          pulseElement(anchors.current.get(key) ?? null, 1.25, 260);
          if (f.player === HUMAN) shakeElement(rootRef.current, 5);
          break;
        }
        case "win":
          sfx.play("win");
          shakeElement(rootRef.current, 7, 500);
          particles.confetti(180);
          later(() => particles.confetti(120), 500);
          break;
        case "lose":
          sfx.play("lose");
          shakeElement(rootRef.current, 12, 500);
          break;
      }
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fx]);

  /* ---------- actions ---------- */
  const start = useCallback(() => {
    sfx.unlock();
    sfx.play("click");
    dispatch({ type: "NEW_GAME", now: now() });
  }, []);

  const tryPlay = useCallback(
    (card: Card, el: HTMLElement | null) => {
      if (!myTurn || !playableIds.has(card.id)) {
        wiggleElement(el);
        sfx.play("error");
        return;
      }
      lastPlayRect.current = el?.getBoundingClientRect() ?? null;
      dispatch({ type: "PLAY", player: HUMAN, cardId: card.id, now: now() });
    },
    [myTurn, playableIds],
  );

  const draw = useCallback(() => {
    if (!myTurn || drawnCardId !== null) {
      sfx.play("error");
      return;
    }
    dispatch({ type: "DRAW", player: HUMAN, now: now() });
  }, [myTurn, drawnCardId]);

  const pass = useCallback(() => dispatch({ type: "PASS", player: HUMAN, now: now() }), []);
  const callUno = useCallback(() => dispatch({ type: "CALL_UNO", now: now() }), []);
  const chooseColor = useCallback((c: Color) => dispatch({ type: "CHOOSE_COLOR", color: c, now: now() }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE", now: now() }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME", now: now() }), []);
  const nextRound = useCallback(() => {
    sfx.play("click");
    dispatch({ type: "NEXT_ROUND", now: now() });
  }, []);

  const submitScore = useCallback(
    (name: string) => {
      saveName(name);
      setPlayerName(name);
      const entry = { name, score: state.score, round: state.round, date: Date.now() };
      const { list } = saveHighScore(entry);
      setScores(list);
      setSavedDate(entry.date);
      setScoreSaved(true);
      sfx.play("combo");
    },
    [state.score, state.round],
  );

  const canSubmit = phase === "gameover" && !scoreSaved && qualifies(state.score);

  const restart = useCallback(() => {
    if (phase === "gameover" && !scoreSaved && qualifies(state.score)) {
      const entry = { name: playerName, score: state.score, round: state.round, date: Date.now() };
      setScores(saveHighScore(entry).list);
    }
    sfx.unlock();
    sfx.play("click");
    dispatch({ type: "NEW_GAME", now: now() });
  }, [phase, scoreSaved, state.score, state.round, playerName]);

  const toMenu = useCallback(() => {
    setScores(loadHighScores());
    dispatch({ type: "MENU" });
  }, []);

  const toggleMute = useCallback(() => {
    sfx.unlock();
    setMuted(sfx.toggleMute());
  }, []);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (target && target.tagName === "BUTTON" && (k === "enter" || k === " ")) {
        // keep keyboard controls deterministic: never let a focused button double-fire
        e.preventDefault();
        target.blur();
      }

      if (phase === "menu") {
        if (k === "enter" || k === " ") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (phase === "gameover") {
        if (k === "r" || k === "enter" || k === " ") {
          e.preventDefault();
          restart();
        }
        return;
      }
      if (phase === "roundover") {
        if (k === "enter" || k === " ") {
          e.preventDefault();
          nextRound();
        }
        return;
      }
      if (k === "p" || k === "escape") {
        e.preventDefault();
        if (phase === "paused") resume();
        else pause();
        return;
      }
      if (phase === "paused") return;
      if (k === "m") {
        toggleMute();
        return;
      }
      if (pendingWild) {
        const c = COLOR_KEYS[k];
        if (c) chooseColor(c);
        return;
      }
      if (k === "u") {
        callUno();
        return;
      }
      if (!me) return;
      if (k === "d") {
        draw();
        return;
      }
      if (k === "arrowleft" || k === "arrowright") {
        e.preventDefault();
        if (!myTurn || playable.length === 0) return;
        const dir = k === "arrowleft" ? -1 : 1;
        const n = me.hand.length;
        let i = selected;
        for (let step = 0; step < n; step++) {
          i = (i + dir + n) % n;
          if (playableIds.has(me.hand[i].id)) break;
        }
        setSelected(i);
        sfx.play("click");
        return;
      }
      if (k === "enter" || k === " ") {
        e.preventDefault();
        if (!myTurn) return;
        if (mustDraw) {
          draw();
          return;
        }
        if (drawnCardId !== null && !playableIds.has(me.hand[selected]?.id)) {
          const dc = me.hand.find((c) => c.id === drawnCardId);
          if (dc) tryPlay(dc, cardRefs.current.get(dc.id) ?? null);
          return;
        }
        const card = me.hand[selected];
        if (card) tryPlay(card, cardRefs.current.get(card.id) ?? null);
        return;
      }
      if (k === "k" || k === "backspace") {
        if (drawnCardId !== null) pass();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pendingWild, me, myTurn, selected, playable, playableIds, drawnCardId, mustDraw, start, restart, nextRound, pause, resume, draw, pass, tryPlay, callUno, chooseColor, toggleMute]);

  /* ---------- derived UI ---------- */
  const unoHot =
    phase === "playing" &&
    ((unoWindow !== null && unoWindow.player === HUMAN) || (me && me.hand.length === 2 && !me.calledUno && myTurn));
  const catchHot = phase === "playing" && unoWindow !== null && unoWindow.player !== HUMAN;
  const humanDeadline = unoWindow && unoWindow.player === HUMAN ? unoWindow.deadline : 0;
  const unoRemaining = useMemo(() => (humanDeadline ? Math.max(0, humanDeadline - Date.now()) : 0), [humanDeadline]);
  const winnerName = state.winner !== null ? players[state.winner]?.name ?? "" : "";

  return (
    <div
      ref={rootRef}
      className="table-bg table-felt relative h-full w-full overflow-hidden"
      onPointerUp={(e) => {
        const t = e.target as HTMLElement | null;
        const btn = t?.closest("button");
        if (btn) window.setTimeout(() => btn.blur(), 0);
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[58]" />
      <FlyLayer ref={flyRef} />
      <FloatLayer ref={floatRef} />

      {phase === "menu" ? (
        <StartScreen onStart={start} scores={scores} muted={muted} onToggleMute={toggleMute} />
      ) : (
        <div className="absolute inset-0 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* HUD */}
          <header className="flex items-start justify-between px-3 pt-2 sm:px-5">
            <div className="flex flex-col">
              <div ref={setAnchor("score")} className="flex items-baseline gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Score</span>
                <span className="font-display text-2xl tabular-nums text-yellow-200 sm:text-3xl" style={{ textShadow: "0 2px 0 rgba(0,0,0,0.6)" }}>
                  {shownScore.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-display rounded-md px-1.5 py-0.5 text-xs italic transition-all",
                    mult > 1 ? "bg-pink-500 text-white shadow-[0_0_14px_#ec4899]" : "bg-white/10 text-white/40",
                  )}
                  key={mult}
                >
                  COMBO ×{mult}
                </span>
                {state.combo > 0 && <span className="text-[10px] text-white/50">{state.combo} in a row</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Round</div>
                <div className="font-display text-xl leading-none sm:text-2xl">{state.round}</div>
              </div>
              <button
                onClick={toggleMute}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-sm hover:bg-white/10"
                aria-label="Toggle sound"
              >
                {muted ? "🔇" : "🔊"}
              </button>
              <button
                onClick={phase === "paused" ? resume : pause}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-sm hover:bg-white/10"
                aria-label="Pause"
              >
                {phase === "paused" ? "▶" : "❚❚"}
              </button>
            </div>
          </header>

          {/* opponents */}
          <div className="mt-1 flex items-start justify-center gap-1 sm:gap-8">
            {players
              .filter((p) => !p.human)
              .map((p) => (
                <Opponent
                  key={p.id}
                  player={p}
                  active={phase === "playing" && turn === p.id}
                  catchable={catchHot && unoWindow?.player === p.id}
                  catchDeadline={unoWindow?.player === p.id ? unoWindow.deadline : undefined}
                  onCatch={() => dispatch({ type: "CATCH", target: p.id, now: now() })}
                  anchorRef={setAnchor(`bot${p.id}`)}
                />
              ))}
          </div>

          {/* table */}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Table
              discard={state.discard}
              deckCount={state.deck.length}
              currentColor={state.currentColor}
              direction={state.direction}
              canDraw={myTurn && drawnCardId === null}
              mustDraw={mustDraw}
              slamDelay={state.lastPlayedBy === HUMAN ? 150 : 240}
              onDraw={draw}
              deckRef={setAnchor("deck")}
              pileRef={setAnchor("pile")}
            />
          </div>

          {/* action bar */}
          <div className="relative flex items-end justify-between gap-2 px-3 pb-1 sm:px-6">
            <div className="flex min-w-[88px] flex-col items-start gap-1">
              {myTurn && drawnCardId !== null ? (
                <button onClick={pass} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20">
                  PASS <span className="ml-1 hidden sm:inline"><Key>K</Key></span>
                </button>
              ) : (
                <button
                  onClick={draw}
                  disabled={!myTurn}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-black transition-all",
                    mustDraw ? "border-yellow-300 bg-yellow-300 text-slate-900 shadow-[0_0_20px_#fde047]" : "border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40",
                  )}
                >
                  DRAW <span className="ml-1 hidden sm:inline"><Key>D</Key></span>
                </button>
              )}
            </div>

            <div className="flex-1 text-center">
              <div
                key={state.message}
                className={cn(
                  "pop-in inline-block rounded-full px-3 py-1 text-xs font-bold sm:text-sm",
                  myTurn ? "bg-yellow-300 text-slate-900" : "bg-white/10 text-white/80",
                )}
              >
                {phase === "paused" ? "Paused" : state.message}
              </div>
            </div>

            <div className="relative flex min-w-[88px] justify-end">
              <button
                onClick={callUno}
                className={cn(
                  "btn-uno font-display relative grid h-16 w-16 place-items-center rounded-full text-base italic tracking-tight text-yellow-200 sm:h-20 sm:w-20 sm:text-lg",
                  (unoHot || catchHot) && "btn-uno--hot",
                )}
                aria-label="Call UNO"
              >
                {catchHot ? "CATCH" : "UNO!"}
                {unoWindow && unoWindow.player === HUMAN && (
                  <span className="absolute -bottom-2 left-1/2 h-1.5 w-20 -translate-x-1/2 overflow-hidden rounded bg-black/40">
                    <span key={unoWindow.deadline} className="timer-bar block h-full bg-yellow-300" style={{ animationDuration: `${unoRemaining}ms` }} />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* hand */}
          <div
            ref={setAnchor("hand")}
            className={cn("relative mx-auto w-full max-w-5xl px-2 transition-all", myTurn && "drop-shadow-[0_-10px_30px_rgba(253,224,71,0.25)]")}
            style={{ height: "calc(var(--card-w) * 1.5 + 56px)" }}
          >
            {me && (
              <Hand
                key={state.round}
                cards={me.hand}
                playableIds={playableIds}
                selectedIndex={selected}
                myTurn={myTurn}
                drawnCardId={drawnCardId}
                onPlay={tryPlay}
                onSelect={setSelected}
                cardRefs={cardRefs}
              />
            )}
          </div>

          {/* overlays */}
          {pendingWild && phase === "playing" && <ColorPicker onPick={chooseColor} />}
          {phase === "paused" && <PauseScreen onResume={resume} onRestart={restart} onMenu={toMenu} muted={muted} onToggleMute={toggleMute} />}
          {phase === "roundover" && showEnd && state.roundSummary && (
            <RoundOverScreen round={state.round} score={state.score} summary={state.roundSummary} onNext={nextRound} />
          )}
          {phase === "gameover" && showEnd && (
            <GameOverScreen
              winnerName={winnerName.toUpperCase()}
              score={state.score}
              round={state.round}
              cardsPlayed={state.cardsPlayed}
              bestCombo={state.bestCombo}
              canSubmit={canSubmit}
              initialName={playerName}
              scores={scores}
              highlightDate={savedDate}
              onSubmit={submitScore}
              onRestart={restart}
              onMenu={toMenu}
            />
          )}
        </div>
      )}
    </div>
  );
}
