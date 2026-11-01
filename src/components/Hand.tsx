import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { Card } from "../game/types";
import { cn } from "../utils/cn";
import { UnoCard } from "./UnoCard";

interface Props {
  cards: Card[];
  playableIds: Set<number>;
  selectedIndex: number;
  myTurn: boolean;
  drawnCardId: number | null;
  onPlay: (card: Card, el: HTMLElement) => void;
  onSelect: (index: number) => void;
  cardRefs: RefObject<Map<number, HTMLElement>>;
}

export function Hand({ cards, playableIds, selectedIndex, myTurn, drawnCardId, onPlay, onSelect, cardRefs }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [cardW, setCardW] = useState(80);
  const dealing = useRef(true);
  useEffect(() => {
    const t = window.setTimeout(() => {
      dealing.current = false;
    }, 900);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      if (probeRef.current) setCardW(probeRef.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = cards.length;
  const maxSpacing = cardW * 0.78;
  const spacing = n > 1 ? Math.min(maxSpacing, (width - cardW - 8) / (n - 1)) : 0;
  const total = cardW + spacing * (n - 1);
  const start = (width - total) / 2;

  return (
    <div ref={ref} className="relative h-full w-full">
      <div ref={probeRef} className="uno-card pointer-events-none absolute opacity-0" aria-hidden />
      {cards.map((card, i) => {
        const playable = myTurn && playableIds.has(card.id);
        const mid = (n - 1) / 2;
        const rot = n > 1 ? ((i - mid) / Math.max(mid, 1)) * 7 : 0;
        const y = Math.abs(i - mid) * (n > 6 ? 1.6 : 2.4);
        const selected = myTurn && i === selectedIndex && playable;
        const isDrawn = card.id === drawnCardId;
        const style: CSSProperties = {
          ["--x" as string]: `${start + i * spacing}px`,
          ["--y" as string]: `${y}px`,
          ["--r" as string]: `${rot}deg`,
          zIndex: selected || isDrawn ? 60 : i + 1,
          animationDelay: dealing.current ? `${Math.min(i, 8) * 55}ms` : "230ms",
        };
        return (
          <div
            key={card.id}
            ref={(el) => {
              if (el) cardRefs.current.set(card.id, el);
              else cardRefs.current.delete(card.id);
            }}
            className={cn("hand-card", playable && "hand-card--can", (selected || isDrawn) && "hand-card--raised")}
            style={style}
            onPointerEnter={() => playable && onSelect(i)}
            onClick={(e) => onPlay(card, e.currentTarget)}
          >
            <UnoCard card={card} playable={playable} selected={selected} dimmed={myTurn && !playable} />
          </div>
        );
      })}
    </div>
  );
}
