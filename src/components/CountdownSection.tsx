import React, { Suspense } from 'react';

/**
 * Feature 6 — Launch countdown (lazy wrapper).
 * The heavy implementation (video bg, canvas fire, emoji cascade, Firestore
 * counter, confetti) is code-split into ./countdown/CountdownSectionImpl and
 * loaded on demand with a skeleton placeholder to avoid layout shift.
 */
const CountdownSectionImpl = React.lazy(() =>
  import('./countdown/CountdownSectionImpl').then(m => ({ default: m.CountdownSectionImpl })),
);

/** Skeleton matching the section's min-height to avoid CLS while lazy-loading. */
const CountdownSkeleton: React.FC = () => (
  <section id="lancamento" className="relative overflow-hidden min-h-[640px] sm:min-h-[760px] bg-zinc-950">
    <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-950" />
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 animate-pulse">
      <div className="h-10 md:h-14 w-3/4 md:w-2/3 mx-auto rounded-2xl bg-white/10 mb-6" />
      <div className="h-5 w-2/3 md:w-1/2 mx-auto rounded-xl bg-white/5 mb-14" />
      <div className="flex justify-center gap-3 sm:gap-5 mb-16">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 sm:h-40 w-16 sm:w-28 rounded-3xl bg-white/10" />
        ))}
      </div>
      <div className="h-14 w-64 mx-auto rounded-full bg-primary/30" />
    </div>
  </section>
);

/**
 * Cinematic countdown to the Polaris launch (video background, 5 rotating
 * visual styles that alternate every hour, teaser dishes with preview modal,
 * WhatsApp notify flow, live subscriber counter and confetti at zero).
 */
export const CountdownSection: React.FC = () => (
  <Suspense fallback={<CountdownSkeleton />}>
    <CountdownSectionImpl />
  </Suspense>
);
