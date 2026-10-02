import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Heart, Truck, MapPin, Clock } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteContext';
import { useZones, formatEta } from '../ZonesContext';
import { useFavorites } from '../FavoritesContext';
import { MenuItem } from '../types';
import { DishCard } from '../components/DishCard';
import { DishDetailsModal } from '../components/DishDetailsModal';
import { DishCustomizeModal } from '../components/DishCustomizeModal';
import { DishRatingModal } from '../components/DishRatingModal';
import { ZoneSelector } from '../components/ZoneSelector';

/**
 * Menu page with the Feature 4 action commands on every dish card,
 * the Feature 3 zone selector strip and the "Meus Favoritos" filter.
 */
export const Menu: React.FC = () => {
  const { categories, menuItems, loading } = useSite();
  const { selectedZone } = useZones();
  const { favorites } = useFavorites();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Feature 4 modals
  const [detailsItem, setDetailsItem] = useState<MenuItem | null>(null);
  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null);
  const [ratingItem, setRatingItem] = useState<MenuItem | null>(null);

  // Deep link support: /menu?item=<id> opens the dish details modal ("Partilhar Prato" links)
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (!itemId) return;
    const item = menuItems.find(i => i.id === itemId);
    if (item) {
      setDetailsItem(item);
      // Clean the URL so refresh/back doesn't reopen the modal
      setSearchParams({}, { replace: true });
    } else if (!loading) {
      // Dish no longer exists — just clean the URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, menuItems, loading, setSearchParams]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorites = !onlyFavorites || favorites.includes(item.id);
      return matchesCategory && matchesSearch && matchesFavorites;
    });
  }, [menuItems, selectedCategory, searchQuery, onlyFavorites, favorites]);

  const categoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-8">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Menu Digital</h1>
          <p className="text-zinc-500">Escolha os seus pratos favoritos e personalize o seu pedido.</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Procurar no menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-2xl focus:outline-none focus:border-primary shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Delivery zone strip (Feature 3) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-black/5 border border-black/5 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-4 lg:w-72 shrink-0">
            <div className="p-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="font-black text-zinc-900 leading-tight">Entrega em Huambo</h2>
              <p className="text-xs text-zinc-500">Selecione a sua zona para ver taxa e tempo</p>
            </div>
          </div>
          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ZoneSelector variant="dropdown" />
            {selectedZone && (
              <div className="flex flex-wrap items-center gap-3 self-center">
                <span className="px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-full text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  {selectedZone.name}
                </span>
                <span className="px-4 py-2 bg-zinc-100 rounded-full text-sm font-bold text-zinc-900 flex items-center gap-2">
                  Kz{selectedZone.fee}
                </span>
                <span className="px-4 py-2 bg-zinc-100 rounded-full text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  {formatEta(selectedZone)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories + favorites filter */}
      <div className="flex overflow-x-auto pb-8 mb-8 no-scrollbar gap-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-8 py-3 rounded-full font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
            ? 'bg-primary text-white shadow-lg shadow-primary/20'
            : 'bg-white text-zinc-600 border border-black/5 hover:border-primary/30'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-8 py-3 rounded-full font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-white text-zinc-600 border border-black/5 hover:border-primary/30'
            }`}
          >
            {cat.name}
          </button>
        ))}
        {/* Meus Favoritos filter */}
        <button
          onClick={() => setOnlyFavorites(v => !v)}
          className={`px-8 py-3 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            onlyFavorites
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'bg-white text-zinc-600 border border-black/5 hover:border-red-300'
          }`}
        >
          <Heart size={16} fill={onlyFavorites ? 'currentColor' : 'none'} />
          Meus Favoritos
          {favorites.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${onlyFavorites ? 'bg-white text-red-500' : 'bg-red-100 text-red-500'}`}>
              {favorites.length}
            </span>
          )}
        </button>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <DishCard
                item={item}
                categoryName={categoryName(item.categoryId)}
                onOpenDetails={setDetailsItem}
                onOpenCustomize={setCustomizeItem}
                onOpenRating={setRatingItem}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-24 space-y-6">
          <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            {onlyFavorites ? <Heart size={48} /> : <Filter size={48} />}
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-zinc-900">
              {onlyFavorites ? 'Ainda não tem favoritos' : 'Nenhum prato encontrado'}
            </h3>
            <p className="text-zinc-500">
              {onlyFavorites
                ? 'Toque no coração dos pratos que gostar para os guardar aqui. ❤️'
                : 'Tente mudar a categoria ou a sua pesquisa.'}
            </p>
          </div>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setOnlyFavorites(false); }}
            className="text-primary font-bold hover:underline"
          >
            {onlyFavorites ? 'Ver todo o menu' : 'Limpar filtros'}
          </button>
        </div>
      )}

      {/* Feature 4 modals — details / customize / rating */}
      <DishDetailsModal
        item={detailsItem}
        categoryName={detailsItem ? categoryName(detailsItem.categoryId) : undefined}
        onClose={() => setDetailsItem(null)}
      />
      <DishCustomizeModal item={customizeItem} onClose={() => setCustomizeItem(null)} />
      <DishRatingModal item={ratingItem} onClose={() => setRatingItem(null)} />
    </div>
  );
};
