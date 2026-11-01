import { memo } from "react";
import { COLOR_HEX, cardTilt } from "../game/deck";
import type { Card, Color } from "../game/types";
import { cn } from "../utils/cn";
import { UnoCard } from "./UnoCard";

interface Props {
  discard: Card[];
  deckCount: number;
  currentColor: Color;
  direction: 1 | -1;
  canDraw: boolean;
  mustDraw: boolean;
  slamDelay: number;
  onDraw: () => void;
  deckRef: (el: HTMLDivElement | null) => void;
  pileRef: (el: HTMLDivElement | null) => void;
}

export const Table = memo(function Table({
  discard,
  deckCount,
  currentColor,
  direction,
  canDraw,
  mustDraw,
  slamDelay,
  onDraw,
  deckRef,
  pileRef,
}: Props) {
  const visible = discard.slice(-4);
  const topId = discard[discard.length - 1]?.id;
  const hex = COLOR_HEX[currentColor];
  return (
    <div className="relative flex items-center justify-center gap-[calc(var(--card-w)*0.7)]">
      {/* direction ring */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed",
          direction === 1 ? "spin-cw" : "spin-ccw",
        )}
        style={{
          width: "calc(var(--card-w) * 3.9)",
          height: "calc(var(--card-w) * 3.9)",
          borderColor: `color-mix(in srgb, ${hex} 60%, transparent)`,
        }}
      >
        {[0, 180].map((deg) => (
          <span
            key={deg}
            className="absolute left-1/2 top-1/2 grid h-6 w-6 place-items-center text-lg font-black leading-none"
            style={{
              color: hex,
              marginLeft: "-12px",
              marginTop: "-12px",
              transform: `rotate(${deg}deg) translateY(calc(var(--card-w) * -1.95)) scaleX(${direction === 1 ? 1 : -1})`,
              textShadow: `0 0 10px ${hex}`,
            }}
          >
            ➜
          </span>
        ))}
      </div>

      {/* draw pile */}
      <div
        ref={deckRef}
        className={cn("relative cursor-pointer transition-transform active:scale-95", mustDraw && "breathe")}
        style={{ width: "var(--card-w)", aspectRatio: "2 / 3" }}
        onClick={onDraw}
        role="button"
        aria-label="Draw a card"
      >
        {[2, 1, 0].map((i) => (
          <UnoCard
            key={i}
            faceDown
            className="absolute left-0 top-0"
            style={{ transform: `translate(${-i * 2}px, ${-i * 2}px)` }}
          />
        ))}
        {canDraw && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[11%] ring-2 transition-all",
              mustDraw ? "ring-yellow-300 shadow-[0_0_30px_#fde047]" : "ring-white/40",
            )}
          />
        )}
        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white/60">
          {mustDraw ? "Tap to draw" : `Deck · ${deckCount}`}
        </span>
      </div>

      {/* discard pile */}
      <div
        ref={pileRef}
        className="relative"
        style={{ width: "var(--card-w)", aspectRatio: "2 / 3" }}
      >
        {/* color glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 rounded-full blur-2xl transition-colors duration-500"
          style={{
            width: "calc(var(--card-w) * 2.2)",
            height: "calc(var(--card-w) * 2.2)",
            transform: "translate(-50%, -50%)",
            background: hex,
            opacity: 0.35,
          }}
        />
        {visible.map((card) => {
          const isTop = card.id === topId;
          return (
            <div
              key={card.id}
              className={cn("absolute left-1/2 top-1/2", isTop && "pile-slam")}
              style={{
                ["--r" as string]: `${cardTilt(card.id)}deg`,
                transform: `translate(-50%, -50%) rotate(${cardTilt(card.id)}deg)`,
                animationDelay: isTop ? `${slamDelay}ms` : "0ms",
              }}
            >
              <UnoCard card={card} />
            </div>
          );
        })}
        {/* current color chip */}
        <div
          className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white/70"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white/60 transition-colors duration-300" style={{ background: hex }} />
          {currentColor}
        </div>
      </div>
    </div>
  );
});
