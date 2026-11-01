export function shakeElement(el: HTMLElement | null, power = 8, duration = 380) {
  if (!el) return;
  const frames: Keyframe[] = [];
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const k = 1 - i / steps;
    const x = (Math.random() - 0.5) * 2 * power * k;
    const y = (Math.random() - 0.5) * 2 * power * k;
    const r = (Math.random() - 0.5) * power * 0.15 * k;
    frames.push({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` });
  }
  frames.push({ transform: "translate(0,0) rotate(0)" });
  el.animate(frames, { duration, easing: "ease-out" });
}

export function pulseElement(el: HTMLElement | null, scale = 1.15, duration = 220) {
  if (!el) return;
  el.animate([{ transform: "scale(1)" }, { transform: `scale(${scale})` }, { transform: "scale(1)" }], {
    duration,
    easing: "ease-out",
  });
}

export function wiggleElement(el: HTMLElement | null) {
  if (!el) return;
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 260, easing: "ease-out" },
  );
}
