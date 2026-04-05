import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, ShoppingCart, X, Star, Filter, Utensils } from 'lucide-react';
import { useSite } from '../SiteContext';
import { useCart } from '../CartContext';
import { MenuItem } from '../types';

export const Menu: React.FC = () => {
  const { categories, menuItems, loading } = useSite();
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<{ name: string; price: number }[]>([]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const handleAddToCart = () => {
    if (selectedItem) {
      addToCart(selectedItem, quantity, selectedExtras);
      setSelectedItem(null);
      setQuantity(1);
      setSelectedExtras([]);
    }
  };

  const toggleExtra = (extra: { name: string; price: number }) => {
    setSelectedExtras(prev => {
      const exists = prev.find(e => e.name === extra.name);
      if (exists) return prev.filter(e => e.name !== extra.name);
      return [...prev, extra];
    });
  };

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
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
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

      {/* Categories */}
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
              className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-black/5 border border-black/5 group hover:border-primary/30 transition-all flex flex-col"
            >
              <div className="relative h-56 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <Utensils size={48} />
                  </div>
                )}
                {item.isPromo && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    Promoção
                  </div>
                )}
                {item.isPopular && (
                  <div className="absolute top-4 right-4 bg-primary text-white p-2 rounded-full shadow-lg">
                    <Star size={16} fill="currentColor" />
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-grow space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-zinc-900 leading-tight">{item.name}</h3>
                  <span className="text-xl font-black text-primary">Kz{item.price.toFixed(2)}</span>
                </div>
                <p className="text-zinc-500 text-sm line-clamp-2 flex-grow">{item.description}</p>
                <button
                  onClick={() => setSelectedItem(item)}
                  className="w-full py-4 rounded-2xl bg-zinc-100 text-zinc-900 font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center space-x-2"
                >
                  <Plus size={18} />
                  <span>Adicionar</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-24 space-y-6">
          <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <Filter size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-zinc-900">Nenhum prato encontrado</h3>
            <p className="text-zinc-500">Tente mudar a categoria ou a sua pesquisa.</p>
          </div>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="text-primary font-bold hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Item Modal (Extras Selection) */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden relative z-10 shadow-2xl"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 backdrop-blur-md rounded-full text-zinc-900 hover:bg-zinc-100 transition-all z-20"
              >
                <X size={24} />
              </button>

              <div className="h-64 relative">
                {selectedItem.image ? (
                  <img src={selectedItem.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <Utensils size={64} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight text-zinc-900">{selectedItem.name}</h3>
                  <p className="text-zinc-500 leading-relaxed">{selectedItem.description}</p>
                </div>

                {/* Extras */}
                {selectedItem.extras && selectedItem.extras.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Extras</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedItem.extras.map((extra) => (
                        <button
                          key={extra.name}
                          onClick={() => toggleExtra(extra)}
                          className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                            selectedExtras.find(e => e.name === extra.name)
                            ? 'bg-secondary/10 border-secondary text-zinc-900'
                            : 'bg-white border-black/5 text-zinc-600 hover:border-secondary/50'
                          }`}
                        >
                          <span className="font-medium">{extra.name}</span>
                          <span className="text-xs font-bold">+Kz{extra.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity & Add */}
                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                  <div className="flex items-center space-x-6 bg-zinc-100 p-2 rounded-2xl">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 bg-white rounded-xl text-zinc-900 shadow-sm hover:bg-primary hover:text-white transition-all"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="text-xl font-black w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 bg-white rounded-xl text-zinc-900 shadow-sm hover:bg-primary hover:text-white transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className="flex-grow ml-6 py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3"
                  >
                    <ShoppingCart size={24} />
                    <span>Adicionar • Kz{((selectedItem.price + selectedExtras.reduce((s, e) => s + e.price, 0)) * quantity).toFixed(2)}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
