import React from 'react';
import { formatDigit, unitProgress, BRAND_RED, type CountdownStyleProps } from './shared';

const LIQUID_CSS = `
@keyframes liquid-wave {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes liquid-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(220,38,38,.28), inset 0 0 18px rgba(0,0,0,.4); }
  50% { box-shadow: 0 0 40px rgba(220,38,38,.5), inset 0 0 24px rgba(0,0,0,.45); }
}
.liquid-unit {
  background: linear-gradient(180deg, rgba(15,15,18,.88), rgba(30,10,10,.82));
  border: 1.5px solid rgba(220,38,38,.55);
  animation: liquid-glow 2.6s ease-in-out infinite;
}
.liquid-wave {
  position: absolute;
  top: -10px;
  left: 0;
  width: 200%;
  height: 20px;
  animation: liquid-wave 3.5s linear infinite;
}
`;

const UNITS: { key: 'days' | 'hour' | 'minute' | 'second'; label: string }[] = [
  { key: 'days', label: 'DIAS' },
  { key: 'hour', label: 'HORAS' },
  { key: 'minute', label: 'MIN' },
  { key: 'second', label: 'SEG' },
];

/**
 * STYLE 1 — LIQUID FILL
 * Each unit is a tall rounded container that fills with brand-red liquid from the
 * bottom. The fill % depletes per unit (Days max 365, Hours 24, Min/Sec 60),
 * with a wide SVG wave oscillating at the liquid surface. Digit sits on top in white.
 */
export const LiquidFillStyle: React.FC<CountdownStyleProps> = ({ countdown, reduced }) => {
  const heights: Record<string, number> = {
    days: unitProgress(countdown.days, 'days'),
    hour: unitProgress(countdown.hours, 'hours'),
    minute: unitProgress(countdown.minutes, 'minutes'),
    second: unitProgress(countdown.seconds, 'seconds'),
  };

  return (
    <div>
      <style>{LIQUID_CSS}</style>
      <div className="flex justify-center items-stretch gap-2 sm:gap-5">
        {UNITS.map((u, idx) => {
          const pct = heights[u.key];
          return (
            <React.Fragment key={u.key}>
              {idx > 0 && <span className="font-black self-center text-white/50" style={{ fontSize: 'clamp(28px, 6vw, 60px)' }} aria-hidden="true">:</span>}
              <div className="liquid-unit rounded-[28px] px-2 sm:px-6 py-3 sm:py-5 text-center min-w-[64px] sm:min-w-[110px] overflow-hidden relative">
                {/* Liquid column — height transitions smoothly (0.9s ease) */}
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{
                    height: `${pct}%`,
                    transition: reduced ? undefined : 'height 0.9s ease',
                    background: `linear-gradient(180deg, ${BRAND_RED}, ${BRAND_RED}cc)`,
                  }}
                >
                  {/* Wave at the liquid surface */}
                  {!reduced && (
                    <svg className="liquid-wave" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                      <path
                        d="M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 T 125 10 T 150 10 T 175 10 T 200 10 V 20 H 0 Z"
                        fill={BRAND_RED}
                      />
                    </svg>
                  )}
                </div>
                {/* Digit on top of the liquid */}
                <div
                  className="relative z-10 font-black tabular-nums text-white"
                  style={{
                    fontSize: 'clamp(48px, 10vw, 96px)',
                    textShadow: '0 2px 12px rgba(0,0,0,.55)',
                  }}
                >
                  {formatDigit(countdown[u.key === 'hour' ? 'hours' : u.key === 'minute' ? 'minutes' : u.key === 'second' ? 'seconds' : 'days'])}
                </div>
                <p className="relative z-10 text-[9px] sm:text-xs font-bold uppercase tracking-widest text-white mt-2">{u.label}</p>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
