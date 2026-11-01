interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: "circle" | "rect" | "star";
  rot: number;
  vr: number;
  gravity: number;
  drag: number;
}

const MAX_PARTICLES = 700;

class ParticleSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private ps: Particle[] = [];
  private raf = 0;
  private last = 0;
  private dpr = 1;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  detach() {
    window.removeEventListener("resize", this.resize);
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas = null;
    this.ctx = null;
    this.ps = [];
  }

  private resize = () => {
    if (!this.canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * this.dpr);
    this.canvas.height = Math.floor(window.innerHeight * this.dpr);
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
  };

  private add(p: Particle) {
    if (this.ps.length >= MAX_PARTICLES) this.ps.shift();
    this.ps.push(p);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  burst(x: number, y: number, colors: string[], count = 24, opts: { speed?: number; size?: number; gravity?: number } = {}) {
    const speed = opts.speed ?? 320;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.75);
      this.add({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.5,
        size: (opts.size ?? 7) * (0.5 + Math.random()),
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() < 0.6 ? "circle" : "rect",
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
        gravity: opts.gravity ?? 700,
        drag: 0.9,
      });
    }
  }

  ring(x: number, y: number, color: string, count = 32) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const v = 380;
      this.add({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        maxLife: 0.6,
        size: 5,
        color,
        shape: "circle",
        rot: 0,
        vr: 0,
        gravity: 0,
        drag: 0.86,
      });
    }
  }

  confetti(count = 160) {
    const colors = ["#ff3b3b", "#ffcc1f", "#2fd36a", "#2f8cff", "#ffffff", "#ff7ad9"];
    const w = window.innerWidth;
    for (let i = 0; i < count; i++) {
      this.add({
        x: Math.random() * w,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 120,
        vy: 100 + Math.random() * 200,
        life: 0,
        maxLife: 2.2 + Math.random() * 1.5,
        size: 6 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() < 0.3 ? "star" : "rect",
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        gravity: 160,
        drag: 0.98,
      });
    }
  }

  private loop = (t: number) => {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    const alive: Particle[] = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5;
            ctx.lineTo(Math.cos(a) * p.size * 0.6, Math.sin(a) * p.size * 0.6);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      alive.push(p);
    }
    ctx.restore();
    this.ps = alive;
    if (alive.length > 0) {
      this.raf = requestAnimationFrame(this.loop);
    } else {
      this.raf = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
}

export const particles = new ParticleSystem();
