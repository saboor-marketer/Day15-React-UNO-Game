import type { SoundName } from "../game/types";

const MUTE_KEY = "uno-arcade:muted";

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  /** Must be called from a user gesture to unlock audio. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    return this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number; attack?: number } = {},
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur);
    const vol = opts.vol ?? 0.5;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1800;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  play(name: SoundName) {
    switch (name) {
      case "play":
        this.noise(0.08, 0.25);
        this.tone(520, 0.12, { type: "triangle", vol: 0.4, slide: 780 });
        break;
      case "draw":
        this.noise(0.06, 0.2);
        this.tone(300, 0.1, { type: "triangle", vol: 0.25, slide: 220 });
        break;
      case "click":
        this.tone(900, 0.05, { type: "square", vol: 0.15 });
        break;
      case "error":
        this.tone(180, 0.18, { type: "sawtooth", vol: 0.25, slide: 120 });
        break;
      case "hit":
        this.noise(0.15, 0.4);
        this.tone(140, 0.3, { type: "sawtooth", vol: 0.4, slide: 60 });
        break;
      case "skip":
        this.tone(600, 0.08, { type: "square", vol: 0.2 });
        this.tone(400, 0.12, { type: "square", vol: 0.2, delay: 0.08 });
        break;
      case "reverse":
        this.tone(400, 0.1, { type: "triangle", vol: 0.3, slide: 800 });
        this.tone(800, 0.1, { type: "triangle", vol: 0.3, slide: 400, delay: 0.1 });
        break;
      case "combo":
        this.tone(880, 0.08, { type: "square", vol: 0.15 });
        this.tone(1320, 0.1, { type: "square", vol: 0.15, delay: 0.07 });
        break;
      case "uno":
        this.tone(660, 0.1, { type: "square", vol: 0.3 });
        this.tone(880, 0.1, { type: "square", vol: 0.3, delay: 0.1 });
        this.tone(1320, 0.25, { type: "square", vol: 0.3, delay: 0.2 });
        break;
      case "catch":
        this.tone(220, 0.12, { type: "sawtooth", vol: 0.3 });
        this.tone(165, 0.25, { type: "sawtooth", vol: 0.3, delay: 0.12, slide: 90 });
        break;
      case "win": {
        const notes = [523, 659, 784, 1047, 784, 1047, 1319];
        notes.forEach((n, i) => this.tone(n, 0.18, { type: "triangle", vol: 0.35, delay: i * 0.11 }));
        break;
      }
      case "lose": {
        const notes = [392, 349, 311, 262];
        notes.forEach((n, i) => this.tone(n, 0.3, { type: "sawtooth", vol: 0.25, delay: i * 0.22 }));
        break;
      }
    }
  }
}

export const sfx = new Sfx();
