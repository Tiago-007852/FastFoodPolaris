import React, { useEffect, useRef } from 'react';
import { formatDigit, type CountdownStyleProps } from './shared';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number; // 1 → 0
  decay: number;
}

const FIRE_CSS = `
@keyframes fire-sep-pulse {
  0%, 100% { color: #FF6B00; text-shadow: 0 0 10px rgba(255,107,0,.35); transform: scale(1); }
  50% { color: #FFD700; text-shadow: 0 0 22px rgba(255,140,0,.75); transform: scale(1.12); }
}
.fire-sep { animation: fire-sep-pulse 1s ease-in-out infinite; }
`;

/** Fire gradient: #FF4500 → #FF8C00 → #FFD700 → transparent, based on particle age. */
const particleColor = (age: number): string => {
  if (age < 0.33) {
    const t = age / 0.33;
    return `rgba(${255}, ${Math.round(69 + (140 - 69) * t)}, ${Math.round(0 + (0) * t)}, ${(0.9 - age * 0.5).toFixed(2)})`;
  }
  if (age < 0.66) {
    const t = (age - 0.33) / 0.33;
    return `rgba(255, ${Math.round(140 + (215 - 140) * t)}, ${Math.round(0 + 0 * t)}, ${(0.65 - age * 0.45).toFixed(2)})`;
  }
  const t = Math.min(1, (age - 0.66) / 0.34);
  return `rgba(255, 215, ${Math.round(0 + 120 * t)}, ${(0.35 * (1 - t)).toFixed(2)})`;
};

/**
 * STYLE 0 — FIRE BURN
 * Each unit renders its number on a canvas with a particle fire simulation:
 * particles rise from the digit base in a #FF4500→#FF8C00→#FFD700 gradient.
 * rAF loop is cancelled on unmount; particle count halves on mobile.
 */
const FireDigit: React.FC<{ value: number; isMobile: boolean; reduced: boolean }> = ({ value, isMobile, reduced }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  // Latest digit text, read by the draw loop so the rAF loop survives value changes
  const textRef = useRef(formatDigit(value));
  textRef.current = formatDigit(value);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const labelEl = labelRef.current;
    if (!canvas || !labelEl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawnPerFrame = isMobile ? 15 : 30;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Draw the bold digit text on the canvas (spec: bold 96px, #FF6B00)
      const fontSize = parseFloat(getComputedStyle(labelEl).fontSize) || (isMobile ? 56 : 96);
      ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FF6B00';
      ctx.shadowColor = 'rgba(255, 107, 0, 0.6)';
      ctx.shadowBlur = 18;
      ctx.fillText(textRef.current, w / 2, h / 2);
      ctx.shadowBlur = 0;

      // Spawn new particles at the digit base
      const particles = particlesRef.current;
      for (let i = 0; i < spawnPerFrame; i++) {
        particles.push({
          x: w / 2 + (Math.random() - 0.5) * fontSize * 0.9,
          y: h * 0.78 + Math.random() * h * 0.14,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -(0.8 + Math.random() * 1.8),
          size: 1.5 + Math.random() * 3.5,
          life: 1,
          decay: 0.012 + Math.random() * 0.02,
        });
      }

      // Update + paint particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx + Math.sin((p.y + i) * 0.05) * 0.35;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0 || p.y < -10) {
          particles.splice(i, 1);
          continue;
        }
        const age = 1 - p.life;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = particleColor(age);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + p.life * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Cap particle pool to avoid runaway memory
      if (particles.length > (isMobile ? 300 : 700)) particles.splice(0, particles.length - (isMobile ? 300 : 700));

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      particlesRef.current = [];
    };
  }, [isMobile, reduced]);

  return (
    <div className="relative flex items-center justify-center">
      {/* In-flow span reserves the layout height; the canvas overlays it and paints
          the same digit with fire particles. */}
      <span
        ref={labelRef}
        className="font-black tabular-nums select-none"
        style={{
          fontSize: 'clamp(48px, 10vw, 96px)',
          color: '#FF6B00',
          opacity: reduced ? 1 : 0, // hidden once the canvas paints the same text
        }}
      >
        {textRef.current}
      </span>
      {!reduced && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />}
    </div>
  );
};

const UNITS: { key: 'days' | 'hours' | 'minutes' | 'seconds'; label: string }[] = [
  { key: 'days', label: 'DIAS' },
  { key: 'hours', label: 'HORAS' },
  { key: 'minutes', label: 'MIN' },
  { key: 'seconds', label: 'SEG' },
];

export const FireBurnStyle: React.FC<CountdownStyleProps> = ({ countdown, isMobile, reduced }) => {
  return (
    <div>
      <style>{FIRE_CSS}</style>
      <div className="flex justify-center items-stretch gap-2 sm:gap-5">
        {UNITS.map((u, idx) => (
          <React.Fragment key={u.key}>
            {idx > 0 && (
              <span
                className="fire-sep font-black self-center"
                style={{ fontSize: 'clamp(28px, 6vw, 60px)' }}
                aria-hidden="true"
              >
                :
              </span>
            )}
            <div
              className="rounded-3xl px-2 sm:px-6 py-4 sm:py-6 text-center min-w-[64px] sm:min-w-[110px] border border-[#FF6B00]/25 bg-black/40 backdrop-blur-xl"
              style={{ boxShadow: '0 0 34px rgba(255, 107, 0, 0.22), inset 0 0 24px rgba(255, 69, 0, 0.10)' }}
            >
              <FireDigit value={countdown[u.key]} isMobile={isMobile} reduced={reduced} />
              <p className="text-[9px] sm:text-xs font-bold uppercase tracking-widest mt-2" style={{ color: '#FF6B00' }}>
                {u.label}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
