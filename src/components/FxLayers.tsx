import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { Card } from "../game/types";
import { UnoCard } from "./UnoCard";

/* ---------------- Flying cards ---------------- */
interface Flight {
  id: number;
  from: DOMRect;
  to: DOMRect;
  card?: Card;
  faceDown: boolean;
  duration: number;
  delay: number;
}

export interface FlyHandle {
  fly: (f: Omit<Flight, "id">) => void;
}

let flightId = 0;

function FlyingCard({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const { from, to, duration, delay } = flight;
      const w = el.offsetWidth || 1;
      const h = el.offsetHeight || 1;
      const sx = from.width / w;
      const sy = from.height / h;
      const s0 = Math.min(sx, sy) || 1;
      const tx0 = from.left + from.width / 2 - w / 2;
      const ty0 = from.top + from.height / 2 - h / 2;
      const tx1 = to.left + to.width / 2 - w / 2;
      const ty1 = to.top + to.height / 2 - h / 2;
      const midRot = (Math.random() - 0.5) * 40;
      const anim = el.animate(
        [
          { transform: `translate(${tx0}px, ${ty0}px) scale(${s0}) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${(tx0 + tx1) / 2}px, ${(ty0 + ty1) / 2 - 30}px) scale(1.1) rotate(${midRot}deg)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${tx1}px, ${ty1}px) scale(1) rotate(0deg)`, opacity: 1 },
        ],
        { duration, delay, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)", fill: "both" },
      );
      anim.onfinish = () => onDone(flight.id);
    },
    [flight, onDone],
  );
  return (
    <div ref={ref} className="absolute left-0 top-0 will-change-transform" style={{ opacity: 0 }}>
      <UnoCard card={flight.card} faceDown={flight.faceDown} />
    </div>
  );
}

export const FlyLayer = forwardRef<FlyHandle>(function FlyLayer(_, ref) {
  const [flights, setFlights] = useState<Flight[]>([]);
  useImperativeHandle(ref, () => ({
    fly: (f) => setFlights((fs) => [...fs.slice(-12), { ...f, id: ++flightId }]),
  }));
  const done = useCallback((id: number) => setFlights((fs) => fs.filter((f) => f.id !== id)), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[55]">
      {flights.map((f) => (
        <FlyingCard key={f.id} flight={f} onDone={done} />
      ))}
    </div>
  );
});

/* ---------------- Floating text ---------------- */
interface Float {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: "sm" | "md" | "lg";
}

export interface FloatHandle {
  spawn: (x: number, y: number, text: string, color?: string, size?: "sm" | "md" | "lg") => void;
}

let floatId = 0;
const SIZE: Record<Float["size"], string> = { sm: "text-sm sm:text-base", md: "text-xl sm:text-2xl", lg: "text-3xl sm:text-4xl" };

export const FloatLayer = forwardRef<FloatHandle>(function FloatLayer(_, ref) {
  const [items, setItems] = useState<Float[]>([]);
  const timers = useRef<number[]>([]);
  useImperativeHandle(ref, () => ({
    spawn: (x, y, text, color = "#fff", size = "md") => {
      const id = ++floatId;
      const jitter = (Math.random() - 0.5) * 30;
      setItems((it) => [...it.slice(-14), { id, x: x + jitter, y, text, color, size }]);
      timers.current.push(window.setTimeout(() => setItems((it) => it.filter((f) => f.id !== id)), 1050));
    },
  }));
  return (
    <>
      {items.map((f) => (
        <div key={f.id} className={`float-text ${SIZE[f.size]}`} style={{ left: f.x, top: f.y, color: f.color }}>
          {f.text}
        </div>
      ))}
    </>
  );
});
