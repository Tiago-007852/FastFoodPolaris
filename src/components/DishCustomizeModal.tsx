import React, { useEffect, useState } from 'react';
import { Plus, Minus, ShoppingCart, Utensils, SlidersHorizontal } from 'lucide-react';
import { MenuItem } from '../types';
import { Modal } from './Modal';
import { useCart } from '../CartContext';
import { useToast } from './ToastProvider';

interface DishCustomizeModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

/**
 * Feature 4 — "Personalizar" modal.
 * Lets the customer choose a size/portion, paid add-ons, ingredients to remove
 * and the quantity. Everything is translated into the existing cart "extras"
 * mechanism, so the cart and WhatsApp checkout work without schema changes.
 */
export const DishCustomizeModal: React.FC<DishCustomizeModalProps> = ({ item, onClose }) => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<{ name: string; price: number }[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);

  // Reset whenever a new dish is opened
  useEffect(() => {
    if (item) {
      setQuantity(1);
      setSelectedExtras([]);
      setSelectedSize(item.sizes && item.sizes.length > 0 ? item.sizes[0].name : '');
      setRemovedIngredients([]);
    }
  }, [item]);

  if (!item) return <Modal open={false} onClose={onClose}><div /></Modal>;

  const size = (item.sizes || []).find(s => s.name === selectedSize);
  // The size price is the TOTAL price of that portion — the cart adds it as a
  // delta on top of the base price (never negative).
  const sizeDelta = size ? Math.max(0, size.price - item.price) : 0;
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const unitTotal = item.price + sizeDelta + extrasTotal;
  const grandTotal = unitTotal * quantity;

  const ingredientList = (item.ingredients || '').split(',').map(s => s.trim()).filter(Boolean);

  const toggleExtra = (extra: { name: string; price: number }) => {
    setSelectedExtras(prev => {
      const exists = prev.find(e => e.name === extra.name);
      if (exists) return prev.filter(e => e.name !== extra.name);
      return [...prev, extra];
    });
  };

  const toggleRemoved = (ingredient: string) => {
    setRemovedIngredients(prev => {
      if (prev.includes(ingredient)) return prev.filter(i => i !== ingredient);
      return [...prev, ingredient];
    });
  };

  const handleAdd = () => {
    // Translate size + removals into the cart's extras list
    const entries: { name: string; price: number }[] = [...selectedExtras];
    if (size && sizeDelta > 0) {
      entries.push({ name: `Tamanho: ${size.name}`, price: sizeDelta });
    }
    for (const ing of removedIngredients) {
      entries.push({ name: `Sem ${ing}`, price: 0 });
    }

    addToCart(item, quantity, entries);
    showToast(`${quantity}x ${item.name} personalizado e adicionado ao carrinho! 🛒`, 'success');
    onClose();
  };

  return (
    <Modal open={!!item} onClose={onClose} maxWidth="max-w-2xl">
      {/* Header image */}
      <div className="relative h-44 shrink-0">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
            <Utensils size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
        <div className="absolute bottom-3 left-8 flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-primary" />
          <h3 className="text-2xl font-black tracking-tight text-zinc-900">Personalizar</h3>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <p className="text-zinc-500 text-sm -mt-4">{item.name}</p>

        {/* Sizes / portions */}
        {item.sizes && item.sizes.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Tamanho / Porção</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {item.sizes.map(s => {
                const active = s.name === selectedSize;
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSelectedSize(s.name)}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      active
                        ? 'bg-secondary/10 border-secondary shadow-lg shadow-secondary/10'
                        : 'bg-white border-black/5 hover:border-secondary/50'
                    }`}
                  >
                    <span className="block text-sm font-bold text-zinc-900">{s.name}</span>
                    <span className="block text-xs font-black text-primary mt-1">Kz{s.price.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Paid add-ons (extras) */}
        {item.extras && item.extras.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Adicionais</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.extras.map(extra => {
                const active = !!selectedExtras.find(e => e.name === extra.name);
                return (
                  <button
                    key={extra.name}
                    type="button"
                    onClick={() => toggleExtra(extra)}
                    className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                      active
                        ? 'bg-secondary/10 border-secondary text-zinc-900'
                        : 'bg-white border-black/5 text-zinc-600 hover:border-secondary/50'
                    }`}
                  >
                    <span className="font-medium">{extra.name}</span>
                    <span className="text-xs font-bold">+Kz{extra.price.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Remove ingredients */}
        {ingredientList.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Remover Ingredientes</h4>
            <div className="flex flex-wrap gap-2">
              {ingredientList.map(ing => {
                const active = removedIngredients.includes(ing);
                return (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => toggleRemoved(ing)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      active
                        ? 'bg-red-50 border-red-200 text-red-600 line-through'
                        : 'bg-white border-black/5 text-zinc-600 hover:border-red-200'
                    }`}
                  >
                    Sem {ing}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity + total */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-6 border-t border-black/5">
          <div className="flex items-center justify-center space-x-6 bg-zinc-100 p-2 rounded-2xl">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2 bg-white rounded-xl text-zinc-900 shadow-sm hover:bg-primary hover:text-white transition-all"
              aria-label="Diminuir quantidade"
            >
              <Minus size={20} />
            </button>
            <span className="text-xl font-black w-8 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="p-2 bg-white rounded-xl text-zinc-900 shadow-sm hover:bg-primary hover:text-white transition-all"
              aria-label="Aumentar quantidade"
            >
              <Plus size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex-grow py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3"
          >
            <ShoppingCart size={22} />
            <span>Adicionar • Kz{grandTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
