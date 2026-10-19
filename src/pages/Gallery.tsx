import React, { useState } from 'react';
import { Image as ImageIcon, Camera } from 'lucide-react';
import { useSite } from '../SiteContext';
import { MediaLightbox } from '../components/MediaLightbox';
import type { GalleryImage } from '../types';

/**
 * Galeria com grelha responsiva de proporção uniforme, lazy loading e
 * visualização ampliada (lightbox) — fecho por ESC/fundo, já tratado no
 * MediaLightbox. Sem efeitos excessivos: as fotografias mostram-se nítidas.
 */
export const Gallery: React.FC = () => {
  const { settings, gallery } = useSite();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const current: GalleryImage | null =
    openIndex !== null ? gallery[openIndex] ?? null : null;

  const step = (delta: number) =>
    setOpenIndex((i) => {
      if (i === null) return i;
      const next = i + delta;
      return next >= 0 && next < gallery.length ? next : i;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center space-y-4 mb-14">
        <h1 className="text-5xl font-black tracking-tight text-zinc-900">Galeria</h1>
        <p className="text-zinc-500 max-w-xl mx-auto">
          Explore os nossos pratos e o ambiente da Polaris Fast-Food em Huambo.
        </p>
      </div>

      {gallery.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <Camera size={56} className="text-zinc-300 mx-auto" aria-hidden />
          <p className="text-zinc-500 font-medium">
            Ainda não há fotografias publicadas. Volte em breve.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {gallery.map((image, idx) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setOpenIndex(idx)}
              className="relative group rounded-2xl overflow-hidden shadow-lg shadow-black/5 border border-black/5 bg-zinc-100 aspect-[4/3] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Ampliar: ${image.title || 'fotografia da galeria'}`}
            >
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.title || 'Fotografia da Polaris Fast-Food'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <ImageIcon size={36} aria-hidden />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                {image.category && (
                  <span className="block text-[10px] font-bold text-secondary uppercase tracking-widest">
                    {image.category}
                  </span>
                )}
                <span className="block text-sm font-bold text-white truncate">
                  {image.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {current && (
        <MediaLightbox
          open
          onClose={() => setOpenIndex(null)}
          url={current.url}
          type="image"
          title={current.title || 'Fotografia da galeria'}
        />
      )}

      {gallery.length > 1 && openIndex !== null && (
        <div className="fixed inset-x-0 bottom-8 z-[120] flex justify-center gap-3 px-4">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={openIndex === 0}
            className="px-5 py-3 rounded-full bg-white/95 hover:bg-white text-zinc-900 font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fotografia anterior"
          >
            ‹ Anterior
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={openIndex === gallery.length - 1}
            className="px-5 py-3 rounded-full bg-white/95 hover:bg-white text-zinc-900 font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fotografia seguinte"
          >
            Seguinte ›
          </button>
        </div>
      )}

      {/* CTA Instagram */}
      <section className="mt-20 py-16 px-6 bg-zinc-900 rounded-[48px] sm:rounded-[60px] text-center space-y-5 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tight">Siga-nos no Instagram</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            Veja novidades e divulgações em tempo real.
          </p>
          <a
            href={`https://instagram.com/${(settings?.instagram || 'fastfoodexpress').replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-10 py-5 bg-white text-zinc-900 rounded-full font-black text-lg hover:bg-primary hover:text-white transition-all shadow-2xl shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ver perfil
          </a>
        </div>
      </section>
    </div>
  );
};
