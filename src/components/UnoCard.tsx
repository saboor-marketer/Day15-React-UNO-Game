import { memo, type CSSProperties } from "react";
import { COLOR_HEX } from "../game/deck";
import type { Card } from "../game/types";
import { cn } from "../utils/cn";

interface Props {
  card?: Card;
  faceDown?: boolean;
  className?: string;
  style?: CSSProperties;
  playable?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

function SkipIcon({ size = "1em" }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ReverseIcon({ size = "1em" }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M4 9.5 L10.5 3 L10.5 7 L17 7 C19 7 20.5 8.5 20.5 10.5 L20.5 12 L17.5 12 L17.5 10.5 C17.5 10.2 17.3 10 17 10 L10.5 10 L10.5 14 Z" />
      <path d="M20 14.5 L13.5 21 L13.5 17 L7 17 C5 17 3.5 15.5 3.5 13.5 L3.5 12 L6.5 12 L6.5 13.5 C6.5 13.8 6.7 14 7 14 L13.5 14 L13.5 10 Z" />
    </svg>
  );
}

function WildIcon({ small }: { small?: boolean }) {
  return (
    <span
      className={cn("uno-wild-icon", small && "uno-wild-icon--sm")}
      style={{
        background: `conic-gradient(from -45deg, ${COLOR_HEX.red} 0 25%, ${COLOR_HEX.blue} 0 50%, ${COLOR_HEX.yellow} 0 75%, ${COLOR_HEX.green} 0)`,
      }}
    />
  );
}

function Glyph({ card, small }: { card: Card; small?: boolean }) {
  switch (card.kind) {
    case "number":
      return <span className="uno-num">{card.value}</span>;
    case "skip":
      return <SkipIcon size={small ? "1em" : "0.95em"} />;
    case "reverse":
      return <ReverseIcon size={small ? "1em" : "0.95em"} />;
    case "draw2":
      return <span className="uno-num">+2</span>;
    case "wild":
      return small ? <span className="uno-num">W</span> : <WildIcon />;
    case "wild4":
      return small ? (
        <span className="uno-num">+4</span>
      ) : (
        <span className="relative grid place-items-center">
          <WildIcon />
          <span className="uno-num absolute text-white" style={{ fontSize: "0.72em" }}>
            +4
          </span>
        </span>
      );
  }
}

export const UnoCard = memo(function UnoCard({ card, faceDown, className, style, playable, dimmed, selected, onClick }: Props) {
  if (faceDown || !card) {
    return (
      <div className={cn("uno-card uno-card--back", className)} style={style} onClick={onClick}>
        <div className="uno-oval uno-oval--back">
          <span className="uno-back-text">UNO</span>
        </div>
      </div>
    );
  }
  const hex = COLOR_HEX[card.color];
  const isWild = card.color === "wild";
  return (
    <div
      className={cn(
        "uno-card",
        isWild && "uno-card--wild",
        playable && "uno-card--playable",
        dimmed && "uno-card--dimmed",
        selected && "uno-card--selected",
        className,
      )}
      style={{ ...style, ["--c" as string]: hex }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <span className="uno-corner uno-corner--tl">
        <Glyph card={card} small />
      </span>
      <div className={cn("uno-oval", isWild && "uno-oval--wild")} />
      <div className="uno-center">
        <Glyph card={card} />
      </div>
      <span className="uno-corner uno-corner--br">
        <Glyph card={card} small />
      </span>
    </div>
  );
});
