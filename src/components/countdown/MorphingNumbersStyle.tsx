import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDigit, type CountdownStyleProps } from './shared';

const MORPH_CSS = `
@keyframes morph-sep-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.morph-sep { animation: morph-sep-blink 1s ease-in-out infinite; }
.morph-num {
  background: linear-gradient(180deg, #ffffff 30%, #d4d4d8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.morph-glass {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 0 28px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255,255,255,.18);
}
`;

const UNITS: { key: 'days' | 'hours' | 'minutes' | 'seconds'; label: string }[] = [
  { key: 'days', label: 'DIAS' },
  { key: 'hours', label: 'HORAS' },
  { key: 'minutes', label: 'MIN' },
  { key: 'seconds', label: 'SEG' },
];

/**
 * STYLE 4 — MORPHING NUMBERS
 * Digits crossfade-scale between values (old scales down + fades out, new scales
 * up + fades in, 0.4s spring cubic-bezier) inside glassmorphism blocks.
 * Gradient-filled numbers, thin white labels, blinking ":" separators.
 */
export const MorphingNumbersStyle: React.FC<CountdownStyleProps> = ({ countdown, reduced }) => {
  return (
    <div>
      <style>{MORPH_CSS}</style>
      <div className="flex justify-center items-stretch gap-2 sm:gap-5">
        {UNITS.map((u, idx) => (
          <React.Fragment key={u.key}>
            {idx > 0 && (
              <span
                className="morph-sep font-black self-center text-white"
                style={{ fontSize: 'clamp(28px, 6vw, 60px)' }}
                aria-hidden="true"
              >
                :
              </span>
            )}
            <div className="morph-glass rounded-[28px] px-2 sm:px-6 py-4 sm:py-6 text-center min-w-[64px] sm:min-w-[110px]">
              <div className="leading-none" style={{ fontSize: 'clamp(48px, 10vw, 96px)' }}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={countdown[u.key]}
                    initial={reduced ? false : { opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? undefined : { opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="morph-num inline-block font-black tabular-nums"
                  >
                    {formatDigit(countdown[u.key])}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="text-[9px] sm:text-xs font-light uppercase tracking-[0.2em] text-white mt-2">
                {u.label}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
