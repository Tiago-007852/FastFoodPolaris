import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSite } from '../SiteContext';
import { Banner } from '../types';
import { BadgeChip } from './BadgeChip';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const AUTOPLAY_MS = 5000;

/** True when today is inside the banner's activeFrom/activeTo window (yyyy-mm-dd strings). */
export const isBannerActive = (b: Banner): boolean => {
  const today = new Date().toISOString().slice(0, 10);
  if (b.activeFrom && today < b.activeFrom) return false;
  if (b.activeTo && today > b.activeTo) return false;
  return true;
};

/** Filter helper shared by the hero carousel and the promotions grid. */
export const bannersForPlacement = (banners: Banner[], placement: 'hero' | 'grid'): Banner[] =>
  banners
    .filter(b => {
      if (b.active === false) return false;
      const matchesPlacement = !b.placement || b.placement === 'both' || b.placement === placement;
      return matchesPlacement && isBannerActive(b);
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/**
 * Feature 1 — Hero banner carousel.
 * Full-width responsive slider with fade transitions, autoplay every 5s
 * (paused on hover), navigation arrows, dot indicators and image/video slides.
 * Each slide has an overlay gradient, headline, subtext and a "Pedir Agora" CTA.
 */
export const HeroCarousel: React.FC = () => {
  const { settings, banners, loading } = useSite();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides: Banner[] = useMemo(() => {
    const fromDb = bannersForPlacement(banners, 'hero');
    if (fromDb.length > 0) return fromDb;
    // Fallback slide built from site settings so the hero is never empty
    return [
      {
        id: 'fallback-hero',
        title: settings?.restaurantName || 'Polaris Fast-Food',
        subtitle: settings?.slogan || 'Onde o apetite encontra direção.',
        mediaUrl:
          settings?.heroImage ||
          'https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=2070&auto=format&fit=crop',
        mediaType: 'image',
        ctaLabel: 'Pedir Agora',
        ctaLink: '/menu',
        badge: '',
        placement: 'hero',
        order: 0,
        active: true,
      },
    ];
  }, [banners, settings]);

  // Keep the index valid when the slide list changes (e.g. banner deactivated)
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  // Autoplay every 5 seconds, paused on hover and for reduced motion users
  useEffect(() => {
    if (paused || reducedMotion || slides.length <= 1) return;
    const t = window.setInterval(() => setIndex(i => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [paused, reducedMotion, slides.length]);

  const goTo = (i: number) => setIndex(((i % slides.length) + slides.length) % slides.length);

  const current = slides[Math.min(index, slides.length - 1)];

  return (
    <section
      className="relative h-[85vh] min-h-[560px] flex items-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Destaques e promoções"
    >
      {/* Slides cross-fade over each other (all absolutely positioned) */}
      <AnimatePresence initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.7 }}
          className="absolute inset-0"
        >
          {/* Background media */}
          <div className="absolute inset-0 z-0">
            {current.mediaType === 'video' ? (
              <video
                src={current.mediaUrl}
                className="w-full h-full object-cover brightness-[0.6]"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={current.mediaUrl}
                alt={current.title}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-full object-cover brightness-[0.6]"
              />
            )}
          </div>

          {/* Overlay gradient for text legibility */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Slide content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 0.15 }}
              className="max-w-2xl text-white space-y-8"
            >
              {current.badge && <BadgeChip label={current.badge} />}
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                {current.title}
              </h1>
              {current.subtitle && (
                <p className="text-xl md:text-2xl font-light text-white/80 max-w-lg">
                  {current.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  to={current.ctaLink || '/menu'}
                  className="px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-bold text-lg transition-all flex items-center group shadow-xl shadow-primary/20"
                >
                  {current.ctaLabel || 'Pedir Agora'}
                  <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows (desktop) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Slide anterior"
            className="hidden sm:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-primary backdrop-blur-md rounded-full text-white transition-all shadow-xl"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Próximo slide"
            className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-primary backdrop-blur-md rounded-full text-white transition-all shadow-xl"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 md:bottom-44 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Ir para slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? 'w-8 h-2.5 bg-secondary'
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Floating info bar (horário / localização / contacto) */}
      <div className="absolute bottom-12 left-0 right-0 z-10 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
            <div className="flex items-center space-x-4 text-white">
              <div className="p-3 bg-primary rounded-2xl">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">Horário</p>
                <p className="font-medium">{settings?.openingHours || 'Seg - Dom: 11:00 - 23:00'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-white">
              <div className="p-3 bg-primary rounded-2xl">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">Localização</p>
                <p className="font-medium truncate max-w-[200px]">{settings?.address || 'Bairro Benfica, Huambo'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-white">
              <div className="p-3 bg-primary rounded-2xl">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">Contacto</p>
                <p className="font-medium">{settings?.phone || '+244 923 456 789'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton while Firestore connects for the first time */}
      {loading && slides.length === 0 && (
        <div className="absolute inset-0 z-30 bg-zinc-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      )}
    </section>
  );
};
