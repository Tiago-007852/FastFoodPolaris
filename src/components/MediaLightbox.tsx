import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface MediaLightboxProps {
  open: boolean;
  onClose: () => void;
  url: string;
  type: 'image' | 'video';
  title?: string;
}

/** Extracts a YouTube video id from the common URL formats. */
const getYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

/**
 * Full-screen media lightbox for the promotions grid.
 * Direct MP4 links play in a native <video> tag; YouTube links are embedded in an iframe.
 * Closes on ESC, backdrop click or the X button.
 */
export const MediaLightbox: React.FC<MediaLightboxProps> = ({ open, onClose, url, type, title }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const youtubeId = type === 'video' ? getYouTubeId(url) : null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-4xl"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-lg truncate pr-4">{title}</p>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all shrink-0"
              >
                <X size={22} />
              </button>
            </div>
            <div className="aspect-video w-full rounded-3xl overflow-hidden bg-black shadow-2xl">
              {type === 'video' ? (
                youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                    title={title || 'Vídeo'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                )
              ) : (
                <img src={url} alt={title || ''} className="w-full h-full object-contain" />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
