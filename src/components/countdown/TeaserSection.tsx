import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Lock } from 'lucide-react';
import { Modal } from '../Modal';
import { BadgeChip } from '../BadgeChip';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import type { TeaserItem } from './shared';

const TEASER_CSS = `
@keyframes teaser-border-pulse {
  0%, 100% {
    border-color: rgba(220, 38, 38, 0.35);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.28), 0 10px 30px rgba(0,0,0,.35);
  }
  50% {
    border-color: rgba(220, 38, 38, 0.85);
    box-shadow: 0 0 0 8px rgba(220, 38, 38, 0), 0 10px 30px rgba(0,0,0,.35);
  }
}
.teaser-card {
  animation: teaser-border-pulse 2.4s ease-in-out infinite;
}
.teaser-card:hover {
  animation-play-state: paused;
}
`;

/**
 * Teaser dish cards: slide-up reveal on scroll (IntersectionObserver via
 * framer-motion viewport), pulsing red border, hover label and a click-through
 * preview modal (dish name revealed, price still hidden).
 */
export const TeaserSection: React.FC<{ teasers: TeaserItem[] }> = ({ teasers }) => {
  const reduced = usePrefersReducedMotion();
  const [preview, setPreview] = useState<TeaserItem | null>(null);

  return (
    <div className="space-y-4 mb-12">
      <style>{TEASER_CSS}</style>
      <p className="text-center text-xs font-bold uppercase tracking-widest text-white/40">
        O que está a chegar
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {teasers.map((dish, idx) => (
          <motion.button
            key={dish.id}
            type="button"
            onClick={() => setPreview(dish)}
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: reduced ? 0 : idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="teaser-card group relative h-56 sm:h-60 rounded-3xl bg-zinc-900 border overflow-hidden text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 transition-transform duration-300 hover:-translate-y-1"
          >
            {/* Real food photography — blurred as a teaser, sharpens on hover */}
            {dish.image ? (
              <img
                src={dish.image}
                alt={dish.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 group-hover:blur-0 group-hover:scale-100 transition-all duration-700"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                <span className="text-5xl">{dish.emoji}</span>
              </div>
            )}

            {/* Legibility scrim + name */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute top-4 right-4 z-10">
              <BadgeChip label="Em Breve" />
            </div>

            <div className="absolute inset-x-0 bottom-0 z-[1] p-4">
              <p className="text-white font-bold leading-tight drop-shadow">{dish.name}</p>
              <p className="text-white/65 text-[11px] mt-0.5 line-clamp-1">{dish.description}</p>
            </div>

            {/* Hover preview label */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pb-3.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
              <span className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-white text-[11px] font-bold flex items-center gap-1.5">
                <Eye size={13} />
                Clica para ver uma prévia
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* -------- Preview modal (lighter blur, name revealed, price hidden) -------- */}
      <Modal open={!!preview} onClose={() => setPreview(null)} maxWidth="max-w-md">
        {preview && (
          <div className="p-8 sm:p-10 space-y-5 text-center">
            <div className="relative h-52 rounded-3xl overflow-hidden bg-zinc-900 flex items-center justify-center">
              {preview.image ? (
                <img
                  src={preview.image}
                  alt={preview.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">{preview.emoji}</span>
              )}
              <div className="absolute top-4 right-4 z-[2]">
                <BadgeChip label="Em Breve" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{preview.name}</h3>
              <p className="text-zinc-500 text-sm">{preview.description}</p>
            </div>
            <div className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-zinc-100 border border-black/5 text-zinc-600 font-bold text-sm">
              <Lock size={18} className="text-primary" />
              Preço revelado no lançamento 🔒
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
