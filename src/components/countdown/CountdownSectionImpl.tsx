import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, ChevronRight, Play, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useSite } from '../../SiteContext';
import { db } from '../../firebase';
import { useToast } from '../ToastProvider';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { bannersForPlacement } from '../HeroCarousel';
import { DEFAULT_TARGET, buildTeasers, type CountdownValues } from './shared';
import { FireBurnStyle } from './FireBurnStyle';
import { LiquidFillStyle } from './LiquidFillStyle';
import { CircleProgressStyle } from './CircleProgressStyle';
import { EmojiCascadeStyle } from './EmojiCascadeStyle';
import { MorphingNumbersStyle } from './MorphingNumbersStyle';
import { TeaserSection } from './TeaserSection';
import { NotificationModal } from './NotificationModal';

const DEFAULT_VIDEO = '/videos/countdown-bg.mp4';

const IMPL_CSS = `
.countdown-overlay {
  background: linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 100%);
}
@keyframes counter-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
.counter-pulse { animation: counter-pulse 0.45s ease-out; }

/* Mobile: keep the 16:9 video in a viewport-height band and fade it out into
   the brand gradient below, instead of zooming a landscape clip into a tall
   narrow box. From md up the section is wide enough for a full-bleed cover. */
.countdown-video {
  height: 70vh;
  height: 70svh;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%);
}
@media (min-width: 768px) {
  .countdown-video {
    height: 100%;
    -webkit-mask-image: none;
    mask-image: none;
  }
}
`;

/** The 5 rotating visual styles, indexed by hours remaining % 5. */
const STYLE_COMPONENTS = [FireBurnStyle, LiquidFillStyle, CircleProgressStyle, EmojiCascadeStyle, MorphingNumbersStyle];
const STYLE_NAMES = ['🔥 Fire Burn', '💧 Liquid Fill', '⭕ Circle Progress', '🎉 Emoji Cascade', '✨ Morphing Numbers'];

const FEATURES = [
  { icon: '🛵', label: 'Entregas Rápidas' },
  { icon: '📍', label: '6 Zonas do Huambo' },
  { icon: '💳', label: 'Pagamento na Entrega' },
  { icon: '⭐', label: 'Avalia os teus pratos' },
  { icon: '❤️', label: 'Guarda os teus favoritos' },
];

/**
 * Feature 6 — Cinematic launch countdown.
 * Full-bleed looping video background, 5 rotating visual styles that change
 * automatically every hour (hours remaining % 5), blurred teaser dishes with
 * preview modal, WhatsApp notify flow, live subscriber counter and confetti
 * at zero.
 */
export const CountdownSectionImpl: React.FC = () => {
  const { settings, menuItems, banners } = useSite();
  const { showToast } = useToast();
  const reducedMotion = usePrefersReducedMotion();

  const [now, setNow] = useState(() => Date.now());
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [countPulse, setCountPulse] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const confettiFiredRef = useRef(false);
  const prevStyleRef = useRef<number | null>(null);

  // ---- 1s tick ----
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // ---- Mobile detection (resize listener) ----
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- Live notification counter: real-time count of notificationSubscribers ----
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notificationSubscribers')),
      (snapshot) => {
        setSubscriberCount(snapshot.size);
        if (snapshot.size > 0) {
          setCountPulse(true);
          window.setTimeout(() => setCountPulse(false), 450);
        }
      },
      (error) => {
        // Collection may not exist yet / rules — counter simply stays 0
        console.error('notificationSubscribers listener:', error);
      },
    );
    return () => unsub();
  }, []);

  // ---- Countdown target (admin-configurable) ----
  const targetIso = settings?.countdownTargetDate || DEFAULT_TARGET;
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const enabled = settings?.countdownEnabled !== false; // master switch (default: on)

  // Custom video URL from Firestore (admin-configurable, not in SiteSettings type yet)
  const videoSrc: string = (settings as { countdownBgVideo?: string } | null)?.countdownBgVideo || DEFAULT_VIDEO;
  /* The video element is always rendered unless it actually failed to load.
     Reduced motion only disables AUTOPLAY (the manual play button still lets
     the visitor start it) — gating the element itself made the section show a
     bare gradient with no video and no control to start it. */
  const showVideo = !videoFailed;
  const autoplayEnabled = !reducedMotion;

  // ---- Video: force playback robustly (React needs muted set as a property) ----
  useEffect(() => {
    if (!showVideo) return;
    const v = videoRef.current;
    if (!v) return;

    // Muted must be set as a DOM property for the autoplay policy to accept it
    v.muted = true;
    v.defaultMuted = true;

    if (!autoplayEnabled) {
      setVideoPlaying(false); // reduced motion: paused on purpose, play button shows
      return;
    }

    let attempts = 0;
    const tryPlay = () => {
      if (attempts > 4) return;
      attempts += 1;
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.then(() => setVideoPlaying(true)).catch(() => { /* still blocked — show the play button */ });
      } else {
        setVideoPlaying(true);
      }
    };

    setVideoPlaying(false);
    tryPlay();
    ['loadeddata', 'canplay', 'playing'].forEach(evt => v.addEventListener(evt, tryPlay));
    document.addEventListener('visibilitychange', tryPlay);
    return () => {
      ['loadeddata', 'canplay', 'playing'].forEach(evt => v.removeEventListener(evt, tryPlay));
      document.removeEventListener('visibilitychange', tryPlay);
    };
  }, [showVideo, autoplayEnabled, videoSrc]);

  // ---- Video: pause while the section is off-screen (saves CPU/battery) ----
  useEffect(() => {
    if (!showVideo) return;
    const el = bgRef.current;
    const v = videoRef.current;
    if (!el || !v || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => {
        const visible = entries[0]?.isIntersecting;
        if (visible) {
          const p = v.play();
          if (p && typeof p.catch === 'function') p.catch(() => { /* noop */ });
        } else {
          v.pause();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showVideo]);

  // ---- Video cleanup: pause + unload on unmount ----
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      if (v) {
        try {
          v.pause();
          v.removeAttribute('src');
          v.load();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  // ---- Countdown maths (computed before any early return) ----
  const totalSecondsRemaining = Math.max(0, Math.floor((target - now) / 1000));
  const styleIndex = Math.floor(totalSecondsRemaining / 3600) % 5;

  // ---- Style-change toast (only after mount, when styleIndex actually changes) ----
  useEffect(() => {
    if (prevStyleRef.current === null) {
      prevStyleRef.current = styleIndex;
      return;
    }
    if (prevStyleRef.current !== styleIndex) {
      prevStyleRef.current = styleIndex;
      showToast('✨ O estilo da contagem mudou!', 'info', 3000);
    }
  }, [styleIndex, showToast]);

  // ---- Confetti at zero: one 5s burst in brand colours, guarded by ref ----
  useEffect(() => {
    if (now < target || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    const colors = ['#E63946', '#FFD700', '#FFFFFF'];
    const end = Date.now() + 5000;
    // Loaded on demand: a missing/blocked chunk must never break the section
    let cancelled = false;
    let raf = 0;
    import('canvas-confetti')
      .then(m => {
        const confetti = m.default;
        const frame = () => {
          if (cancelled) return;
          confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
          confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
          if (Date.now() < end) raf = requestAnimationFrame(frame);
        };
        frame();
      })
      .catch(err => console.error('Confetti failed to load:', err));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [now, target]);

  // ---- Teaser dishes (hook before early returns): real "Novidade" dishes first ----
  const teasers = useMemo(() => buildTeasers(menuItems), [menuItems]);

  if (!enabled) return null;

  // ---- After the launch date: transition to a delivery banner ----
  if (now >= target) {
    return (
      <section id="lancamento" className="relative py-16 bg-primary overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              🎉 Já estamos a entregar!
            </h2>
            <p className="text-white/85 text-lg max-w-xl">
              Faz o teu pedido agora e recebe os teus pratos favoritos em casa.
            </p>
          </div>
          <Link
            to="/menu"
            className="px-10 py-5 bg-white text-primary rounded-full font-black text-lg hover:bg-secondary hover:text-zinc-900 transition-all shadow-2xl shadow-black/20 flex items-center gap-3 shrink-0"
          >
            <ShoppingBag size={22} />
            Pedir Agora
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>
    );
  }

  const diff = Math.max(0, target - now);
  const countdown: CountdownValues = {
    days: Math.floor(diff / 86400000),
    hours: Math.floor(diff / 3600000) % 24,
    minutes: Math.floor(diff / 60000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
    totalSecondsRemaining,
  };

  const StyleComponent = STYLE_COMPONENTS[styleIndex];
  const styleName = STYLE_NAMES[styleIndex];

  // Promo marquee slides: blurred banner previews
  const marqueeMedia = bannersForPlacement(banners, 'hero').slice(0, 6).map(b => b.mediaUrl);

  return (
    <section id="lancamento" className="relative overflow-hidden min-h-[640px] sm:min-h-[760px]">
      <style>{IMPL_CSS}</style>

      {/* ---- Cinematic video background (z-0, behind everything) ---- */}
      <div ref={bgRef} className="absolute inset-0 z-0 overflow-hidden bg-zinc-950">
        {/* On-brand base layer. The video sits on top of this, so there is never a
            bare grey block while it buffers. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, #7f1d1d 0%, #450a0a 45%, #09090b 100%)',
          }}
        />
        {showVideo && (
          /* The source is 16:9. On tall, narrow phones a full-height cover crop
             would zoom in ~4x and look blurry, so the video is confined to a
             viewport-height cinematic band on mobile and masked out below.
             From md up the section is wide enough for a full-bleed cover. */
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay={autoplayEnabled}
            muted
            loop
            playsInline
            /* Mobile gets a lighter preload: 60fps @720p is heavy to fetch up front. */
            preload={isMobile ? 'metadata' : 'auto'}
            onError={e => {
              const err = (e.currentTarget as HTMLVideoElement).error;
              console.error('[countdown] video failed to load', videoSrc, err?.code, err?.message);
              setVideoFailed(true);
            }}
            onPause={() => setVideoPlaying(false)}
            onPlay={() => setVideoPlaying(true)}
            onLoadedData={() => console.info('[countdown] video data ready', videoSrc)}
            /* Inline styles (not a stylesheet rule) so the video can never end up
               with zero height if the component stylesheet is ever missing. */
            className="absolute inset-x-0 top-0 w-full"
            style={{
              objectFit: 'cover',
              transform: 'translateZ(0)',
              height: isMobile ? '70svh' : '100%',
              // Fade the band into the gradient below on mobile only
              maskImage: isMobile ? 'linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%)' : undefined,
              WebkitMaskImage: isMobile ? 'linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%)' : undefined,
            }}
          />
        )}

        {/* If the browser refused autoplay, offer a manual play button so the
            video is always reachable instead of silently showing a still frame. */}
        {showVideo && !videoPlaying && (
          <button
            type="button"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              v.muted = true;
              const p = v.play();
              if (p && typeof p.catch === 'function') p.catch(() => setVideoPlaying(false));
            }}
            className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white text-xs font-bold hover:bg-black/80 transition-colors"
            aria-label="Reproduzir vídeo de fundo"
          >
            <Play size={14} fill="currentColor" />
            Reproduzir vídeo
          </button>
        )}

        {/* Spec overlay gradient: rgba(0,0,0,.72) top → rgba(0,0,0,.55) bottom */}
        <div className="countdown-overlay absolute inset-0" />
        {/* Brand colour accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Headline */}
        <div className="text-center space-y-6 mb-14">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            🚀 As Entregas Chegam ao Huambo em...
          </h2>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
            Prepara-te para receber os teus pratos favoritos em casa
          </p>
        </div>

        {/* ---- Rotating style countdown with 600ms crossfade ---- */}
        <div className="flex items-center justify-center min-h-[260px] mb-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={styleIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="w-full flex justify-center"
            >
              <StyleComponent countdown={countdown} isMobile={isMobile} reduced={reducedMotion} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- Active style badge (fades when the style changes) ---- */}
        <div className="flex justify-center mb-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={styleIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.6 }}
              className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-white/70 text-xs font-bold tracking-wide"
            >
              {styleName}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* ---- Live notification counter ---- */}
        <div className="flex justify-center mb-10">
          <span
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/45 backdrop-blur border border-white/10 text-white/85 text-sm font-bold ${countPulse ? 'counter-pulse' : ''}`}
          >
            🔔 <span className="tabular-nums">{subscriberCount}</span> pessoas já querem ser notificadas
          </span>
        </div>

        {/* CTA */}
        <div className="flex justify-center mb-20">
          <button
            onClick={() => setNotifyOpen(true)}
            className="px-10 py-5 bg-primary hover:bg-primary-hover text-white rounded-full font-black text-lg transition-all shadow-2xl shadow-primary/30 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
          >
            <BellRing size={22} />
            Quero ser Notificado
          </button>
        </div>

        {/* Blurred teaser cards with scroll reveal + preview modal */}
        <TeaserSection teasers={teasers} />

        {/* "O que está por vir" feature strip — staggered entrance + hover lift */}
        <div className="mb-12">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-white/40 mb-6">
            O que está por vir
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {FEATURES.map((f, idx) => (
              <motion.div
                key={f.label}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ delay: reducedMotion ? 0 : idx * 0.15, duration: 0.45, ease: 'easeOut' }}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-black/40 backdrop-blur border border-white/10 text-white/85 text-sm font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 hover:border-primary/40 cursor-default"
              >
                <span className="text-xl">{f.icon}</span>
                {f.label}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Promo teaser marquee — blurred, pulsing banner previews */}
        {marqueeMedia.length > 0 && (
          <div className="marquee-hover-pause overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex gap-5 w-max animate-marquee">
              {[...marqueeMedia, ...marqueeMedia].map((url, i) => (
                <div
                  key={i}
                  className="relative w-52 h-32 rounded-2xl overflow-hidden border border-white/10 animate-soft-pulse shrink-0"
                >
                  <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover blur-[6px] scale-110" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest">
                      Em Breve
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- "Quero ser Notificado" WhatsApp modal (flow unchanged) ---- */}
      <NotificationModal open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </section>
  );
};
