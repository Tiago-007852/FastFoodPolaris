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

interface BoundaryProps {
  children: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

/**
 * Catches chunk-load and render failures (e.g. a stale Vite dep cache serving
 * HTML instead of JS for canvas-confetti) so the section never renders as an
 * empty dark block — it degrades to a simple working countdown instead.
 */
class CountdownErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  // Declared explicitly: this project has no @types/react, so the base class
  // members are untyped. With useDefineForClassFields:false this emits no code.
  props: BoundaryProps;
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('CountdownSection failed to load:', error);
  }

  render() {
    if (this.state.hasError) return <CountdownFallback />;
    return this.props.children;
  }
}

/**
 * Minimal, dependency-free countdown shown when the cinematic version cannot
 * load. Same target date logic so the information is never lost.
 */
const CountdownFallback: React.FC = () => {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const target = new Date('2026-10-05T00:00:00+01:00').getTime();
  const diff = Math.max(0, target - now);
  const units: { value: number; label: string }[] = [
    { value: Math.floor(diff / 86400000), label: 'Dias' },
    { value: Math.floor(diff / 3600000) % 24, label: 'Horas' },
    { value: Math.floor(diff / 60000) % 60, label: 'Min' },
    { value: Math.floor(diff / 1000) % 60, label: 'Seg' },
  ];

  return (
    <section id="lancamento" className="relative py-24 bg-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(220,38,38,.25),transparent_60%)]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          🚀 As Entregas Chegam ao Huambo em...
        </h2>
        <div className="flex justify-center items-stretch gap-3 sm:gap-5">
          {units.map(u => (
            <div
              key={u.label}
              className="rounded-3xl px-3 sm:px-7 py-4 sm:py-6 bg-black/40 backdrop-blur-xl border border-white/15 min-w-[68px] sm:min-w-[110px]"
            >
              <div className="text-3xl sm:text-6xl font-black text-white tabular-nums">
                {String(u.value).padStart(2, '0')}
              </div>
              <p className="text-[9px] sm:text-xs font-bold uppercase tracking-widest text-white/50 mt-2">
                {u.label}
              </p>
            </div>
          ))}
        </div>
        <a
          href="/menu"
          className="inline-block px-10 py-4 bg-primary text-white rounded-full font-black hover:bg-primary-hover transition-all"
        >
          Pedir Agora
        </a>
      </div>
    </section>
  );
};

/**
 * Cinematic countdown to the Polaris launch (video background, 5 rotating
 * visual styles that alternate every hour, teaser dishes with preview modal,
 * WhatsApp notify flow, live subscriber counter and confetti at zero).
 */
export const CountdownSection: React.FC = () => (
  <CountdownErrorBoundary>
    <Suspense fallback={<CountdownSkeleton />}>
      <CountdownSectionImpl />
    </Suspense>
  </CountdownErrorBoundary>
);
