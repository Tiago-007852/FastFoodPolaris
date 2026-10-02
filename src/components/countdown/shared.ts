import type { MenuItem } from '../../types';

/** Default countdown target: October 5, 2026 at 00:00:00 Angola time (UTC+1). */
export const DEFAULT_TARGET = '2026-10-05T00:00:00+01:00';

/** localStorage key for the WhatsApp notification submission (unchanged flow). */
export const STORAGE_KEY = 'polaris_notify_submitted';

/**
 * Fallback teaser dishes when there are not enough "Novidade" dishes in the
 * menu. Real food photography (local, so it always loads) instead of emoji.
 * Pizza and milkshake were intentionally dropped.
 */
export const DEFAULT_TEASERS: { name: string; emoji: string; hint: string; image: string }[] = [
  { name: 'Burger Simples', emoji: '🍔', hint: 'Pão, carne, queijo e molho da casa', image: '/images/teasers/burger-simples.jpg' },
  { name: 'Burger Duplo', emoji: '🍔', hint: 'Duas carnes, queijo derretido e bacon', image: '/images/teasers/burger-duplo.jpg' },
  { name: 'Cachorro-quente', emoji: '🌭', hint: 'Salsicha grelhada com molho e batata', image: '/images/teasers/hot-dog.jpg' },
  { name: 'Sanduíche de Frango', emoji: '🥪', hint: 'Frango grelhado, queijo e salada', image: '/images/teasers/sanduiche-frango.jpg' },
  { name: 'Sanduíche de Carne', emoji: '🥩', hint: 'Carne fatiada com queijo derretido', image: '/images/teasers/sanduiche-carne.jpg' },
  { name: 'Batata Frita com Queijo', emoji: '🍟', hint: 'Batatas crocantes cobertas de queijo', image: '/images/teasers/batata-queijo.jpg' },
];

/** How many teaser cards the section shows. */
export const TEASER_COUNT = DEFAULT_TEASERS.length;

/** Brand red used by the site theme (site primary #dc2626, per @theme tokens). */
export const BRAND_RED = '#dc2626';
/** Gold accent from the site theme. */
export const BRAND_GOLD = '#facc15';

/** Confetti colours (spec) */
export const CONFETTI_COLORS = ['#E63946', '#FFD700', '#FFFFFF'];

export interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSecondsRemaining: number;
}

export const formatDigit = (value: number) => String(value).padStart(2, '0');

/** Max value used by the liquid/ring "depletion" percentage per unit. */
export const UNIT_MAX: Record<keyof Pick<CountdownValues, 'days' | 'hours' | 'minutes' | 'seconds'>, number> = {
  days: 365,
  hours: 24,
  minutes: 60,
  seconds: 60,
};

/** filled % = (1 - remaining / max) * 100, capped 0–100 (spec for Liquid Fill / Circle Progress). */
export const unitProgress = (value: number, unit: keyof typeof UNIT_MAX): number => {
  const pct = (1 - value / UNIT_MAX[unit]) * 100;
  return Math.min(100, Math.max(0, pct));
};

export interface CountdownStyleProps {
  /** Remaining time values (updated every second). */
  countdown: CountdownValues;
  /** True on viewports < 768px. */
  isMobile: boolean;
  /** User prefers reduced motion — static fallbacks must be shown. */
  reduced: boolean;
}

/** Perf probe used to scale canvas particle counts on low-end devices. */
export const isLowEndDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const cores = nav.hardwareConcurrency || 4;
  return cores <= 4;
};

/** Teaser card shape passed down to the TeaserSection. */
export interface TeaserItem {
  id: string;
  name: string;
  description: string;
  image: string;
  emoji: string;
}

/** Builds the teaser list: real "Novidade" menu dishes first, fallback teasers fill the rest. */
export const buildTeasers = (menuItems: MenuItem[]): TeaserItem[] => {
  const fallbackFor = (idx: number): TeaserItem => {
    const t = DEFAULT_TEASERS[idx % DEFAULT_TEASERS.length];
    return {
      id: `teaser-${idx}`,
      name: t.name,
      description: t.hint,
      image: t.image,
      emoji: t.emoji,
    };
  };

  const teasers: TeaserItem[] = menuItems
    .filter(i => i.isNew)
    .slice(0, TEASER_COUNT)
    .map((d, i) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      image: d.image,
      emoji: DEFAULT_TEASERS[i % DEFAULT_TEASERS.length].emoji,
    }));

  for (let i = teasers.length; i < TEASER_COUNT; i++) teasers.push(fallbackFor(i));
  return teasers.slice(0, TEASER_COUNT);
};
