import type { MenuItem } from '../../types';

/** Default countdown target: October 5, 2026 at 00:00:00 Angola time (UTC+1). */
export const DEFAULT_TARGET = '2026-10-05T00:00:00+01:00';

/** localStorage key for the WhatsApp notification submission (unchanged flow). */
export const STORAGE_KEY = 'polaris_notify_submitted';

/** Fallback teaser dishes when there are not enough "Novidade" dishes in the menu. */
export const DEFAULT_TEASERS: { name: string; emoji: string; hint: string }[] = [
  { name: 'Combo Universitário', emoji: '🍔', hint: 'Burger + batatas + bebida' },
  { name: 'Polaris Chicken Crunch', emoji: '🍗', hint: 'Frango crocante especial' },
  { name: 'Milkshake Polaris Gold', emoji: '🥤', hint: 'Edição limitada' },
  { name: 'Pizza Huambo Style', emoji: '🍕', hint: 'Massa artesanal' },
];

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
  const newDishes = menuItems.filter(i => i.isNew).slice(0, 4);
  const fallbackFor = (idx: number): TeaserItem => ({
    id: `teaser-${idx}`,
    name: DEFAULT_TEASERS[idx % DEFAULT_TEASERS.length].name,
    description: DEFAULT_TEASERS[idx % DEFAULT_TEASERS.length].hint,
    image: '',
    emoji: DEFAULT_TEASERS[idx % DEFAULT_TEASERS.length].emoji,
  });
  if (newDishes.length === 0) return [0, 1, 2, 3].map(fallbackFor);
  const teasers: TeaserItem[] = newDishes.map((d, i) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    image: d.image,
    emoji: DEFAULT_TEASERS[i % DEFAULT_TEASERS.length].emoji,
  }));
  for (let i = teasers.length; i < 4; i++) teasers.push(fallbackFor(i));
  return teasers.slice(0, 4);
};
