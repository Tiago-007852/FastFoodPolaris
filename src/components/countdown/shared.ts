import type { MenuItem, Teaser } from '../../types';

/** Default countdown target: October 5, 2026 at 00:00:00 Angola time (UTC+1). */
export const DEFAULT_TARGET = '2026-10-05T00:00:00+01:00';

/** localStorage key for the WhatsApp notification submission (unchanged flow). */
export const STORAGE_KEY = 'polaris_notify_submitted';

/**
 * Social-proof baseline: people who already showed interest before the live
 * counter existed. The counter shows this until Firestore reports real data.
 */
export const BASE_SUBSCRIBERS = 17;

/** localStorage key for signups credited on this device (Firestore writes are
 *  denied for anonymous visitors, so we keep a local boost as a fallback). */
export const LOCAL_COUNT_KEY = 'polaris_notify_local_count';
/** sessionStorage key so one visit never inflates the number repeatedly. */
export const SESSION_CREDITED_KEY = 'polaris_notify_counted';

/** Signups credited on this device. */
export const getLocalSubscriberBoost = (): number => {
  try {
    return Math.max(0, Number(localStorage.getItem(LOCAL_COUNT_KEY)) || 0);
  } catch {
    return 0;
  }
};

/** Credits one signup on this device and returns the new local total. */
export const bumpLocalSubscriberBoost = (): number => {
  const next = getLocalSubscriberBoost() + 1;
  try {
    localStorage.setItem(LOCAL_COUNT_KEY, String(next));
  } catch {
    // localStorage unavailable — the number still bumps for this session
  }
  return next;
};

/** True when this visit has not credited the counter yet. */
export const canCreditSubscriber = (): boolean => {
  try {
    return sessionStorage.getItem(SESSION_CREDITED_KEY) !== '1';
  } catch {
    return true;
  }
};

/** Marks this visit as credited. */
export const markSubscriberCredited = () => {
  try {
    sessionStorage.setItem(SESSION_CREDITED_KEY, '1');
  } catch {
    // ignore
  }
};

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

/**
 * Builds the teaser list for the countdown section.
 * Admin-managed teaser cards always win; with none configured we fall back to
 * the "Novidade" menu dishes and then to the built-in food photography.
 */
export const buildTeasers = (menuItems: MenuItem[], managed: Teaser[] = []): TeaserItem[] => {
  const active = managed
    .filter(t => t && t.enabled !== false && (t.name || t.image))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (active.length > 0) {
    return active.map((t, i) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      image: t.image,
      emoji: DEFAULT_TEASERS[i % DEFAULT_TEASERS.length].emoji,
    }));
  }

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
