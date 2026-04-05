import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import { useSite } from '../SiteContext';

export const Gallery: React.FC = () => {
  const { settings, gallery } = useSite();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-5xl font-black tracking-tight text-zinc-900">Galeria</h1>
        <p className="text-zinc-500 max-w-xl mx-auto">Explore o ambiente do {settings?.restaurantName || 'Polaris Fast-Food'} e os nossos pratos irresistíveis.</p>
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
        {gallery.map((image, idx) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="relative group rounded-[40px] overflow-hidden shadow-2xl shadow-black/5 border border-black/5 break-inside-avoid"
          >
            {image.url ? (
              <img src={image.url} alt={image.title} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110" />
            ) : (
              <div className="w-full aspect-square bg-zinc-100 flex items-center justify-center text-zinc-400">
                <ImageIcon size={48} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-8 flex flex-col justify-end">
              <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">{image.category}</span>
              <h4 className="text-xl font-bold text-white tracking-tight">{image.title}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Instagram CTA */}
      <section className="mt-24 py-16 bg-zinc-900 rounded-[60px] text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tight">Siga-nos no Instagram</h2>
          <p className="text-zinc-400 max-w-md mx-auto">Partilhe as suas fotos connosco usando a hashtag <span className="text-secondary font-bold">#FastFoodExpress</span></p>
          <a
            href={`https://instagram.com/${settings?.instagram?.replace('@', '') || 'fastfoodexpress'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-10 py-5 bg-white text-zinc-900 rounded-full font-black text-lg hover:bg-primary hover:text-white transition-all shadow-2xl shadow-black/20"
          >
            Ver Perfil
          </a>
        </div>
      </section>
    </div>
  );
};
