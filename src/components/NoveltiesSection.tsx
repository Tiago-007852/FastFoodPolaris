import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useSite } from '../SiteContext';
import { Banner } from '../types';
import { BadgeChip } from './BadgeChip';
import { MediaLightbox } from './MediaLightbox';
import { bannersForPlacement } from './HeroCarousel';

/**
 * Feature 1 — "Novidades & Promoções" grid.
 * Responsive grid of media cards below the hero. Image cards open a lightbox
 * with the full picture; video cards (MP4 or YouTube) play in the lightbox modal.
 */
export const NoveltiesSection: React.FC = () => {
  const { banners } = useSite();
  const [lightbox, setLightbox] = useState<Banner | null>(null);

  const gridBanners = bannersForPlacement(banners, 'grid');

  if (gridBanners.length === 0) return null;

  return (
    <section className="py-24 bg-zinc-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Fique por Dentro</h2>
          <h3 className="text-4xl font-black tracking-tight text-zinc-900">Novidades &amp; Promoções</h3>
          <p className="text-zinc-500 max-w-xl mx-auto">
            Acompanhe as nossas campanhas, eventos e lançamentos. Clique num cartão para ver o vídeo ou a imagem completa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {gridBanners.map((banner, idx) => (
            <motion.button
              key={banner.id}
              type="button"
              onClick={() => setLightbox(banner)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: (idx % 3) * 0.1 }}
              className="group text-left bg-white rounded-3xl overflow-hidden shadow-xl shadow-black/5 border border-black/5 hover:border-primary/30 hover:shadow-2xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {/* Media thumbnail */}
              <div className="relative h-56 overflow-hidden">
                {banner.mediaType === 'video' ? (
                  <>
                    <video
                      src={banner.mediaUrl}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                      <span className="p-4 bg-primary text-white rounded-full shadow-2xl group-hover:scale-110 transition-transform">
                        <Play size={28} fill="currentColor" />
                      </span>
                    </div>
                  </>
                ) : (
                  <img
                    src={banner.mediaUrl}
                    alt={banner.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                {banner.badge && (
                  <div className="absolute top-4 left-4">
                    <BadgeChip label={banner.badge} />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="p-6 space-y-2">
                <h4 className="text-lg font-bold text-zinc-900 group-hover:text-primary transition-colors">
                  {banner.title}
                </h4>
                {banner.subtitle && (
                  <p className="text-zinc-500 text-sm line-clamp-2">{banner.subtitle}</p>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-primary pt-2 flex items-center gap-2">
                  <Play size={12} fill="currentColor" />
                  {banner.mediaType === 'video' ? 'Ver Vídeo' : 'Ver Imagem'}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox modal (images, MP4 videos and YouTube links) */}
      <MediaLightbox
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        url={lightbox?.mediaUrl || ''}
        type={lightbox?.mediaType || 'image'}
        title={lightbox?.title}
      />
    </section>
  );
};
