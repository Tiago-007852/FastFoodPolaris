import React, { useEffect, useRef, useState } from 'react';
import { formatDigit, type CountdownStyleProps } from './shared';

const EMOJI_CSS = `
@keyframes emoji-bounce {
  0% { transform: scale(1); }
  45% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.emoji-num-bounce { animation: emoji-bounce 0.45s ease-out; }
@keyframes emoji-label-glow {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
.emoji-label { animation: emoji-label-glow 2.2s ease-in-out infinite; }
`;

const EMOJIS = ['🍔', '🍟', '🍕', '🌮', '🍗', '🍖', '🥤', '🧁', '🍩', '🌯', '🥪', '🍱'];

interface FallingEmoji {
  id: number;
  x: number; // % from left
  y: number; // px from top
  speed: number; // px/frame
  size: number; // px
  opacity: number;
  rotation: number; // deg
  spin: number; // deg/frame
  char: string;
}

/**
 * STYLE 3 — EMOJI CASCADE
 * Food emojis rain down behind the countdown numbers (z-layer between the video
 * and the numbers). Spawn every 300ms, fall 2–5px/frame with random spin/size/
 * opacity, max 40 (20 on mobile), cleanup below the section bottom. Numbers
 * bounce on each second tick. Reduced motion → static emoji grid.
 */
export const EmojiCascadeStyle: React.FC<CountdownStyleProps> = ({ countdown, isMobile, reduced }) => {
  const maxEmojis = isMobile ? 20 : 40;
  const [minSize, maxSize] = isMobile ? [20, 32] : [24, 48];

  const containerRef = useRef<HTMLDivElement>(null);
  const emojisRef = useRef<FallingEmoji[]>([]);
  const [emojis, setEmojis] = useState<FallingEmoji[]>([]);
  const nextId = useRef(0);
  const rafRef = useRef(0);

  // --- Spawn interval + rAF fall loop, both cancelled/cleared on unmount ---
  useEffect(() => {
    if (reduced) return;

    const spawnTimer = window.setInterval(() => {
      const emoji: FallingEmoji = {
        id: nextId.current++,
        x: Math.random() * 96,
        y: -60,
        speed: 2 + Math.random() * 3,
        size: minSize + Math.random() * (maxSize - minSize),
        opacity: 0.4 + Math.random() * 0.4,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 6,
        char: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      };
      emojisRef.current = [...emojisRef.current, emoji].slice(-maxEmojis);
    }, 300);

    let lastTs = 0;
    const tick = (ts: number) => {
      const dt = lastTs ? Math.min(50, ts - lastTs) : 16.7;
      lastTs = ts;
      const step = dt / 16.7; // normalise to ~60fps so 120Hz screens don't fast-forward
      const height = containerRef.current?.offsetHeight ?? 600;
      emojisRef.current = emojisRef.current
        .map(e => ({ ...e, y: e.y + e.speed * step, rotation: (e.rotation + e.spin * step + 360) % 360 }))
        .filter(e => e.y < height + 80); // cleanup once below the bottom
      setEmojis(emojisRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.clearInterval(spawnTimer);
      cancelAnimationFrame(rafRef.current);
      emojisRef.current = [];
      setEmojis([]);
    };
  }, [reduced, maxEmojis, minSize, maxSize]);

  const UNITS = [
    { key: 'days', label: '🗓 DIAS' },
    { key: 'hours', label: '⏰ HORAS' },
    { key: 'minutes', label: '⏱ MIN' },
    { key: 'seconds', label: '⚡ SEG' },
  ] as const;

  return (
    <div>
      <style>{EMOJI_CSS}</style>
      <div ref={containerRef} className="relative">
        {/* Emoji rain — behind the numbers, above the video */}
        {!reduced && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {emojis.map(e => (
              <span
                key={e.id}
                className="absolute top-0 select-none"
                style={{
                  left: `${e.x}%`,
                  fontSize: e.size,
                  opacity: e.opacity,
                  transform: `translateY(${e.y}px) rotate(${e.rotation}deg)`,
                }}
              >
                {e.char}
              </span>
            ))}
          </div>
        )}

        {/* Static emoji grid fallback for reduced motion */}
        {reduced && (
          <div className="flex flex-wrap justify-center gap-3 opacity-40 mb-6 pointer-events-none" aria-hidden="true">
            {EMOJIS.map((ch, i) => (
              <span key={i} style={{ fontSize: 28 }}>{ch}</span>
            ))}
          </div>
        )}

        {/* Numbers */}
        <div className="relative z-10 flex justify-center items-stretch gap-2 sm:gap-5">
          {UNITS.map((u, idx) => (
            <React.Fragment key={u.key}>
              {idx > 0 && (
                <span className="font-black self-center text-white/50" style={{ fontSize: 'clamp(28px, 6vw, 60px)' }} aria-hidden="true">
                  :
                </span>
              )}
              <div className="rounded-[28px] px-2 sm:px-6 py-4 sm:py-6 text-center min-w-[64px] sm:min-w-[110px] bg-black/45 backdrop-blur-xl border border-white/10">
                {/* key remount replays the bounce animation on every second tick */}
                <span
                  key={countdown[u.key]}
                  className={`inline-block font-black tabular-nums text-white ${reduced ? '' : 'emoji-num-bounce'}`}
                  style={{ fontSize: 'clamp(48px, 10vw, 96px)', textShadow: '0 2px 14px rgba(0,0,0,.6)' }}
                >
                  {formatDigit(countdown[u.key])}
                </span>
                <p className="emoji-label text-[9px] sm:text-xs font-bold uppercase tracking-widest text-white mt-2">
                  {u.label}
                </p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
