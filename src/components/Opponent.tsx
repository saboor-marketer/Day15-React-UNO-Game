import { memo, useMemo } from "react";
import type { Player } from "../game/types";
import { cn } from "../utils/cn";
import { UnoCard } from "./UnoCard";

interface Props {
  player: Player;
  active: boolean;
  catchable: boolean;
  catchDeadline?: number;
  onCatch: () => void;
  anchorRef: (el: HTMLDivElement | null) => void;
}

export const Opponent = memo(function Opponent({ player, active, catchable, catchDeadline, onCatch, anchorRef }: Props) {
  const n = player.hand.length;
  const shown = Math.min(n, 7);
  const remaining = useMemo(() => (catchDeadline ? Math.max(0, catchDeadline - Date.now()) : 0), [catchDeadline]);
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-all duration-300 sm:px-4",
        active ? "scale-105" : "opacity-80",
        catchable && "cursor-pointer",
      )}
      onClick={catchable ? onCatch : undefined}
    >
      {/* avatar */}
      <div
        ref={anchorRef}
        className={cn(
          "relative grid h-11 w-11 place-items-center rounded-full border-2 text-xl transition-all duration-300 sm:h-14 sm:w-14 sm:text-2xl",
          active ? "border-yellow-300 bg-yellow-300/20 pulse-ring" : "border-white/20 bg-white/10",
        )}
        style={{ ["--ring" as string]: "#fde047" }}
      >
        <span className={cn(active && "bob")}>{player.emoji}</span>
        <span className="absolute -right-1 -bottom-1 grid h-6 min-w-6 place-items-center rounded-full bg-white px-1 text-xs font-black text-slate-900 shadow">
          {n}
        </span>
        {player.calledUno && n === 1 && (
          <span className="uno-badge font-display absolute -top-3 -left-4 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] italic text-yellow-200 shadow-lg ring-2 ring-white">
            UNO!
          </span>
        )}
      </div>
      <div className="text-xs font-bold tracking-wide text-white/90 sm:text-sm">{player.name}</div>

      {/* mini fan */}
      <div className="relative h-7 w-16 sm:h-9 sm:w-20" aria-hidden>
        {Array.from({ length: shown }).map((_, i) => {
          const mid = (shown - 1) / 2;
          return (
            <UnoCard
              key={i}
              faceDown
              className="absolute left-1/2 top-0"
              style={{
                ["--w" as string]: "18px",
                transform: `translateX(-50%) translateX(${(i - mid) * 7}px) rotate(${(i - mid) * 6}deg)`,
                transformOrigin: "50% 120%",
              }}
            />
          );
        })}
      </div>

      {/* thinking dots */}
      {active && (
        <div className="absolute -bottom-2 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-yellow-300 bob"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      {/* catch prompt */}
      {catchable && (
        <div className="pop-in absolute -bottom-9 z-10 flex flex-col items-center">
          <div className="rounded-full bg-yellow-300 px-3 py-1 text-[11px] font-black tracking-wide text-slate-900 shadow-lg shadow-yellow-300/40 breathe whitespace-nowrap">
            FORGOT UNO! TAP ⚡
          </div>
          <div className="mt-1 h-1 w-20 overflow-hidden rounded bg-white/20">
            <div
              key={catchDeadline}
              className="timer-bar h-full bg-yellow-300"
              style={{ animationDuration: `${remaining}ms` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});
