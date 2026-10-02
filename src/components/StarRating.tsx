import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  /** 0–5 (fractional values are rounded to the nearest star) */
  value: number;
  size?: number;
  className?: string;
}

/** Read-only star display used on dish cards and the ratings overview. */
export const StarRating: React.FC<StarRatingProps> = ({ value, size = 14, className = '' }) => (
  <div className={`flex ${className}`} aria-label={`${value.toFixed(1)} de 5 estrelas`}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={size}
        fill={i <= Math.round(value) ? 'currentColor' : 'none'}
        className={i <= Math.round(value) ? 'text-secondary' : 'text-zinc-300'}
      />
    ))}
  </div>
);
