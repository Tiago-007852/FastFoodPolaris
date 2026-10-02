import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingCart, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSite } from '../SiteContext';
import { HeroCarousel } from '../components/HeroCarousel';
import { NoveltiesSection } from '../components/NoveltiesSection';
import { CountdownSection } from '../components/CountdownSection';
import { ReviewsSection } from '../components/ReviewsSection';

export const Home: React.FC = () => {
  const { menuItems } = useSite();

  const popularItems = menuItems.filter(item => item.isPopular).slice(0, 4);
  const promoItems = menuItems.filter(item => item.isPromo).slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Feature 1 — Hero banner carousel (images + videos, autoplay, arrows, dots) */}
      <HeroCarousel />

      {/* Feature 6 — Launch countdown (auto-transitions to a delivery banner after the date) */}
      <CountdownSection />

      {/* Feature 1 — "Novidades & Promoções" media card grid with lightbox */}
      <NoveltiesSection />

      {/* Promo Section */}
      {promoItems.length > 0 && (
        <section className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Ofertas Especiais</h2>
                <h3 className="text-4xl font-black tracking-tight text-zinc-900">Promoções do Dia</h3>
              </div>
              <Link to="/menu" className="text-primary font-bold flex items-center hover:underline">
                Ver todas <ArrowRight size={18} className="ml-2" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {promoItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group relative h-96 rounded-3xl overflow-hidden shadow-2xl shadow-black/5"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <Utensils size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
                    <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-4">
                      Promoção
                    </span>
                    <h4 className="text-2xl font-bold text-white mb-2">{item.name}</h4>
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-3xl font-black text-secondary">Kz{item.price.toFixed(2)}</span>
                      <Link to="/menu" className="bg-white text-black p-3 rounded-full hover:bg-secondary hover:text-white transition-all">
                        <ShoppingCart size={20} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Items */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Os Favoritos</h2>
            <h3 className="text-4xl font-black tracking-tight text-zinc-900">Pratos Mais Populares</h3>
            <p className="text-zinc-500 max-w-xl mx-auto">Descubra por que estes são os pratos mais pedidos pelos nossos clientes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {popularItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-3xl shadow-xl shadow-black/5 border border-black/5 group hover:border-primary/30 transition-all"
              >
                <div className="aspect-square rounded-2xl overflow-hidden mb-6 relative">
                  {item.image ? (
                    <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <Utensils size={32} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                    Kz{item.price.toFixed(2)}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-zinc-900 mb-2">{item.name}</h4>
                <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{item.description}</p>
                <Link
                  to="/menu"
                  className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-900 font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                >
                  Adicionar ao Pedido
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewsSection />

      {/* CTA Section — delivery only (Feature 2) */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">Pronto para matar a sua fome?</h2>
          <p className="text-white/80 text-xl max-w-2xl mx-auto">
            Peça agora e receba em casa em menos de 40 minutos, em qualquer zona do Huambo.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link
              to="/menu"
              className="px-10 py-5 bg-white text-primary rounded-full font-black text-lg hover:bg-secondary hover:text-zinc-900 transition-all shadow-2xl shadow-black/20"
            >
              Pedir Agora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
