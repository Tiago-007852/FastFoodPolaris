import React from 'react';
import { formatDigit, unitProgress, BRAND_RED, type CountdownStyleProps } from './shared';

const CIRCLE_CSS = `
@keyframes circle-glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(220,38,38,.45)); }
  50% { filter: drop-shadow(0 0 12px rgba(220,38,38,.75)); }
}
.circle-ring { animation: circle-glow-pulse 2.4s ease-in-out infinite; }
.circle-unit {
  background: rgba(10, 10, 14, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
`;

const UNITS: { key: 'days' | 'hours' | 'minutes' | 'seconds'; label: string }[] = [
  { key: 'days', label: 'DIAS' },
  { key: 'hours', label: 'HORAS' },
  { key: 'minutes', label: 'MIN' },
  { key: 'seconds', label: 'SEG' },
];

/**
 * STYLE 2 — CIRCLE PROGRESS
 * Each unit is an SVG progress ring that depletes as the unit value runs down
 * (same progress maths as Liquid Fill). Brand-red stroke with drop-shadow glow,
 * dark-gray track, white digit centered. Rings in a row, labels below.
 */
export const CircleProgressStyle: React.FC<CountdownStyleProps> = ({ countdown, isMobile, reduced }) => {
  const size = isMobile ? 64 : 120;
  const stroke = isMobile ? 6 : 8;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;

  return (
    <div>
      <style>{CIRCLE_CSS}</style>
      <div className="flex justify-center items-start gap-1 sm:gap-5 w-full px-1">
        {UNITS.map((u, idx) => {
          const progress = unitProgress(countdown[u.key], u.key);
          // Ring depletes with remaining time: full ring at max remaining, empty at 0
          const offset = c * (1 - progress / 100);
          return (
            <React.Fragment key={u.key}>
              {idx > 0 && (
                <span
                  className="font-black self-center text-white/50"
                  style={{ fontSize: 'clamp(12px, 3vw, 48px)' }}
                  aria-hidden="true"
                >
                  :
                </span>
              )}
              <div className="circle-unit rounded-2xl sm:rounded-3xl px-1 sm:px-4 py-2 sm:py-4 text-center min-w-0 flex-1 sm:flex-none sm:min-w-[104px] max-w-[150px]">
                <div className="relative mx-auto" style={{ width: size, height: size }}>
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
                    {/* Dark gray track */}
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,120,130,.25)" strokeWidth={stroke} />
                    {/* Brand-red depleting ring */}
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={r}
                      fill="none"
                      stroke={BRAND_RED}
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={c}
                      strokeDashoffset={offset}
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      className="circle-ring"
                      style={{ transition: reduced ? undefined : 'stroke-dashoffset 0.9s ease' }}
                    />
                  </svg>
                  {/* White digit centered inside the ring */}
                  <span
                    className="absolute inset-0 flex items-center justify-center font-black tabular-nums text-white"
                    style={{ fontSize: isMobile ? 20 : 40, textShadow: '0 2px 10px rgba(0,0,0,.5)' }}
                  >
                    {formatDigit(countdown[u.key])}
                  </span>
                </div>
                <p className="text-[8px] sm:text-xs font-bold uppercase tracking-widest text-white mt-2 sm:mt-3 truncate">{u.label}</p>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
