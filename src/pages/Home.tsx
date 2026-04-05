import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Star, Clock, MapPin, Phone, ArrowRight, ShoppingCart, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSite } from '../SiteContext';

import { ReviewsSection } from '../components/ReviewsSection';

export const Home: React.FC = () => {
  const { settings, menuItems } = useSite();

  const popularItems = menuItems.filter(item => item.isPopular).slice(0, 4);
  const promoItems = menuItems.filter(item => item.isPromo).slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={settings?.heroImage || "https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=2070&auto=format&fit=crop"}
            alt="Hero"
            className="w-full h-full object-cover brightness-[0.6]"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl text-white space-y-8"
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
              {settings?.restaurantName || 'Polaris Fast-Food'}
            </h1>
            <p className="text-xl md:text-2xl font-light text-white/80 max-w-lg">
              {settings?.slogan || 'O sabor que você merece, com a rapidez que você precisa.'}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                to="/menu"
                className="px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-bold text-lg transition-all flex items-center group shadow-xl shadow-primary/20"
              >
                Ver Menu Digital
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/contacto"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full font-bold text-lg transition-all border border-white/20"
              >
                Fazer Pedido
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Floating Info */}
        <div className="absolute bottom-12 left-0 right-0 z-10 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 gap-8 bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
              <div className="flex items-center space-x-4 text-white">
                <div className="p-3 bg-primary rounded-2xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">Horário</p>
                  <p className="font-medium">{settings?.openingHours || '11:00 - 23:00'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-white">
                <div className="p-3 bg-primary rounded-2xl">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">Localização</p>
                  <p className="font-medium truncate max-w-[200px]">{settings?.address || 'Rua Principal, 123'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-white">
                <div className="p-3 bg-primary rounded-2xl">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">Contacto</p>
                  <p className="font-medium">{settings?.phone || '(11) 99999-9999'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
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
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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

      {/* CTA Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">Pronto para matar a sua fome?</h2>
          <p className="text-white/80 text-xl max-w-2xl mx-auto">
            Peça agora e receba em casa em menos de 30 minutos ou venha levantar no local.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link
              to="/menu"
              className="px-10 py-5 bg-white text-primary rounded-full font-black text-lg hover:bg-secondary hover:text-zinc-900 transition-all shadow-2xl shadow-black/20"
            >
              Fazer Pedido Agora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
