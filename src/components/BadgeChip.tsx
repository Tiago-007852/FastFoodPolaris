import React from 'react';

/** Colour styles per badge label — keeps the badge system consistent across the site. */
const BADGE_STYLES: Record<string, string> = {
  'Promoção': 'bg-red-500 text-white',
  'Novidade': 'bg-secondary text-zinc-900',
  'Evento': 'bg-zinc-900 text-white',
  'Mais Pedido': 'bg-primary text-white',
  'Esgotado': 'bg-zinc-700 text-white',
  'Em Breve': 'bg-secondary text-zinc-900',
};

interface BadgeChipProps {
  label: string;
  className?: string;
}

export const BadgeChip: React.FC<BadgeChipProps> = ({ label, className = '' }) => (
  <span
    className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg ${
      BADGE_STYLES[label] || 'bg-primary text-white'
    } ${className}`}
  >
    {label}
  </span>
);
