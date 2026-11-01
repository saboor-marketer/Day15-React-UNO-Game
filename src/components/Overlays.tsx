import { useEffect, useState, type ReactNode } from "react";
import { COLORS, COLOR_HEX, COLOR_LABEL } from "../game/deck";
import type { HighScore } from "../game/highscores";
import type { Card, Color, RoundSummary } from "../game/types";
import { cn } from "../utils/cn";
import { UnoCard } from "./UnoCard";

function Shell({ children, className, dim = true }: { children: ReactNode; className?: string; dim?: boolean }) {
  return (
    <div
      className={cn(
        "overlay-in absolute inset-0 z-40 flex items-center justify-center p-4",
        dim && "bg-black/60 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block min-w-6 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-center font-mono text-[11px] font-bold text-white/90 shadow-[0_2px_0_rgba(255,255,255,0.15)]">
      {children}
    </kbd>
  );
}

/* ---------------- High score table ---------------- */
export function HighScoreTable({ scores, highlightDate, compact }: { scores: HighScore[]; highlightDate?: number; compact?: boolean }) {
  if (scores.length === 0) {
    return <div className="py-4 text-center text-sm text-white/50">No scores yet — be the first!</div>;
  }
  return (
    <ol className={cn("w-full space-y-1", compact && "text-sm")}>
      {scores.map((s, i) => {
        const me = s.date === highlightDate;
        return (
          <li
            key={s.date + "-" + i}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-1.5",
              me ? "bg-yellow-300/20 ring-1 ring-yellow-300" : i % 2 === 0 ? "bg-white/5" : "",
            )}
          >
            <span className={cn("w-6 text-right font-black tabular-nums", i === 0 ? "text-yellow-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-white/50")}>
              {i + 1}
            </span>
            <span className="font-display flex-1 truncate tracking-wider">{s.name}</span>
            <span className="text-xs text-white/50">R{s.round}</span>
            <span className="font-display w-20 text-right tabular-nums text-yellow-200">{s.score.toLocaleString()}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Start screen ---------------- */
const HERO: Card[] = [
  { id: -1, color: "red", kind: "number", value: 7 },
  { id: -2, color: "blue", kind: "reverse", value: -1 },
  { id: -3, color: "wild", kind: "wild4", value: -1 },
  { id: -4, color: "green", kind: "draw2", value: -1 },
  { id: -5, color: "yellow", kind: "number", value: 1 },
];

export function StartScreen({ onStart, scores, muted, onToggleMute }: { onStart: () => void; scores: HighScore[]; muted: boolean; onToggleMute: () => void }) {
  return (
    <Shell dim={false} className="table-bg table-felt">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 md:flex-row md:items-stretch md:gap-10">
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="relative mb-4 h-32 w-56 sm:h-40 sm:w-72">
            {HERO.map((c, i) => (
              <div
                key={c.id}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) translateX(${(i - 2) * 40}px) translateY(${Math.abs(i - 2) * 10}px) rotate(${(i - 2) * 12}deg)`,
                  zIndex: i,
                }}
              >
                <div className="title-card" style={{ animationDelay: `${i * 0.25}s` }}>
                  <UnoCard card={c} style={{ ["--w" as string]: "clamp(56px, 9vw, 76px)" }} />
                </div>
              </div>
            ))}
          </div>
          <h1
            className="font-display px-4 text-7xl italic leading-tight tracking-tighter text-yellow-300 sm:text-8xl"
            style={{
              textShadow: "0 3px 0 #ff7a1a, 0 6px 0 #8a1c1c, 0 12px 24px rgba(0,0,0,0.6), 0 0 40px rgba(255,204,31,0.35)",
            }}
          >
            UNO
          </h1>
          <div className="font-display mt-1 text-sm tracking-[0.5em] text-white/70">ARCADE</div>
          <p className="mt-4 max-w-xs text-sm text-white/70">
            Empty your hand against three bots. Chain plays for combos, call <b className="text-yellow-300">UNO</b> in
            time, and climb rounds for a high score.
          </p>
          <button
            onClick={onStart}
            className="btn-primary font-display mt-6 rounded-2xl px-12 py-4 text-2xl italic tracking-wider text-white"
            autoFocus
          >
            PLAY
          </button>
          <div className="mt-3 text-xs text-white/50">
            Press <Key>Enter</Key> or tap to start
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-left text-[11px] text-white/60 sm:text-xs">
            <div><Key>←</Key> <Key>→</Key> select card</div>
            <div><Key>Enter</Key> / <Key>Space</Key> play</div>
            <div><Key>D</Key> draw a card</div>
            <div><Key>U</Key> call UNO / catch</div>
            <div><Key>1</Key>–<Key>4</Key> pick wild color</div>
            <div><Key>P</Key> / <Key>Esc</Key> pause</div>
          </div>
          <button onClick={onToggleMute} className="mt-4 rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:bg-white/10">
            {muted ? "🔇 Sound off" : "🔊 Sound on"}
          </button>
        </div>
        <div className="glass w-full max-w-sm rounded-2xl p-4 md:w-72 md:self-center">
          <div className="font-display mb-2 text-center text-sm tracking-widest text-yellow-300">🏆 HIGH SCORES</div>
          <HighScoreTable scores={scores} compact />
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- Pause ---------------- */
export function PauseScreen({ onResume, onRestart, onMenu, muted, onToggleMute }: { onResume: () => void; onRestart: () => void; onMenu: () => void; muted: boolean; onToggleMute: () => void }) {
  return (
    <Shell>
      <div className="glass scale-in flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl p-6 text-center">
        <div className="font-display text-4xl italic tracking-tight">PAUSED</div>
        <button onClick={onResume} className="btn-primary font-display mt-2 w-full rounded-xl py-3 text-lg italic text-white">
          RESUME
        </button>
        <button onClick={onRestart} className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 font-bold hover:bg-white/10">
          Restart
        </button>
        <button onClick={onMenu} className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 font-bold hover:bg-white/10">
          Main menu
        </button>
        <button onClick={onToggleMute} className="mt-1 text-xs text-white/60 hover:text-white">
          {muted ? "🔇 Sound off" : "🔊 Sound on"}
        </button>
        <div className="text-xs text-white/40">
          <Key>P</Key> or <Key>Esc</Key> to resume
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- Color picker ---------------- */
export function ColorPicker({ onPick }: { onPick: (c: Color) => void }) {
  return (
    <Shell className="bg-black/50">
      <div className="scale-in flex flex-col items-center gap-4">
        <div className="font-display text-2xl italic tracking-wide drop-shadow-lg sm:text-3xl">PICK A COLOR</div>
        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((c, i) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className="group relative grid h-28 w-28 place-items-center rounded-2xl border-4 border-white/80 text-white transition-transform hover:scale-110 active:scale-95 sm:h-32 sm:w-32"
              style={{
                background: COLOR_HEX[c],
                boxShadow: `0 0 30px ${COLOR_HEX[c]}, inset 0 -8px 0 rgba(0,0,0,0.25)`,
              }}
            >
              <span className="font-display text-lg italic drop-shadow">{COLOR_LABEL[c]}</span>
              <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 text-xs font-bold">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="text-xs text-white/60">
          Keys <Key>1</Key> <Key>2</Key> <Key>3</Key> <Key>4</Key> or <Key>R</Key> <Key>Y</Key> <Key>G</Key> <Key>B</Key>
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- Round over ---------------- */
export function RoundOverScreen({ round, score, summary, onNext }: { round: number; score: number; summary: RoundSummary; onNext: () => void }) {
  const total = summary.winBonus + summary.cardBonus + summary.comboBonus;
  return (
    <Shell>
      <div className="glass scale-in flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl p-6 text-center">
        <div className="text-sm font-bold tracking-widest text-yellow-300">ROUND {round} CLEARED</div>
        <div className="font-display text-5xl italic">YOU WIN!</div>
        <div className="mt-2 w-full space-y-1 text-sm">
          <Row label="Round bonus" value={summary.winBonus} />
          <Row label="Opponents' cards" value={summary.cardBonus} />
          <Row label={`Best combo`} value={summary.comboBonus} />
          <div className="my-1 border-t border-white/10" />
          <Row label="Bonus total" value={total} strong />
        </div>
        <div className="mt-2 text-xs uppercase tracking-widest text-white/50">Total score</div>
        <div className="font-display text-3xl tabular-nums text-yellow-200">{score.toLocaleString()}</div>
        <button onClick={onNext} className="btn-primary font-display mt-3 w-full rounded-xl py-3 text-lg italic text-white" autoFocus>
          ROUND {round + 1} ➜
        </button>
        <div className="text-xs text-white/40">
          Bots get smarter each round · <Key>Enter</Key>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong ? "font-black text-white" : "text-white/80")}>
      <span>{label}</span>
      <span className="tabular-nums text-yellow-200">+{value.toLocaleString()}</span>
    </div>
  );
}

/* ---------------- Game over ---------------- */
export function GameOverScreen({
  winnerName,
  score,
  round,
  cardsPlayed,
  bestCombo,
  canSubmit,
  initialName,
  scores,
  highlightDate,
  onSubmit,
  onRestart,
  onMenu,
}: {
  winnerName: string;
  score: number;
  round: number;
  cardsPlayed: number;
  bestCombo: number;
  canSubmit: boolean;
  initialName: string;
  scores: HighScore[];
  highlightDate?: number;
  onSubmit: (name: string) => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const [name, setName] = useState(initialName);
  useEffect(() => setName(initialName), [initialName]);
  return (
    <Shell>
      <div className="glass scale-in flex max-h-full w-full max-w-md flex-col items-center gap-3 overflow-auto rounded-3xl p-5 text-center sm:p-6">
        <div className="text-sm font-bold tracking-widest text-red-400">GAME OVER</div>
        <div className="font-display text-4xl italic sm:text-5xl">{winnerName} WINS</div>
        <div className="grid w-full grid-cols-3 gap-2 text-xs">
          <Stat label="Score" value={score.toLocaleString()} big />
          <Stat label="Round" value={String(round)} />
          <Stat label="Best combo" value={`×${Math.min(1 + bestCombo, 5)}`} sub={`${cardsPlayed} cards`} />
        </div>

        {canSubmit ? (
          <form
            className="flex w-full items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(name.trim().toUpperCase() || "ACE");
            }}
          >
            <div className="flex-1 text-left text-xs text-white/70">
              🎉 New high score! Enter your name
              <input
                autoFocus
                value={name}
                maxLength={8}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                className="font-display mt-1 w-full rounded-lg border border-yellow-300/50 bg-black/40 px-3 py-2 text-lg tracking-widest text-yellow-200 outline-none focus:border-yellow-300"
              />
            </div>
            <button type="submit" className="btn-primary font-display self-end rounded-xl px-5 py-3 italic text-white">
              SAVE
            </button>
          </form>
        ) : (
          <div className="w-full">
            <div className="font-display mb-1 text-xs tracking-widest text-yellow-300">🏆 HIGH SCORES</div>
            <div className="max-h-44 overflow-auto">
              <HighScoreTable scores={scores} highlightDate={highlightDate} compact />
            </div>
          </div>
        )}

        <div className="flex w-full gap-2">
          <button onClick={onRestart} className="btn-primary font-display flex-1 rounded-xl py-3 text-lg italic text-white">
            PLAY AGAIN
          </button>
          <button onClick={onMenu} className="rounded-xl border border-white/15 bg-white/5 px-4 font-bold hover:bg-white/10">
            Menu
          </button>
        </div>
        <div className="text-xs text-white/40">
          <Key>R</Key> restart instantly
        </div>
      </div>
    </Shell>
  );
}

function Stat({ label, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className={cn("font-display tabular-nums", big ? "text-2xl text-yellow-200" : "text-lg")}>{value}</div>
      {sub && <div className="text-[10px] text-white/40">{sub}</div>}
    </div>
  );
}
