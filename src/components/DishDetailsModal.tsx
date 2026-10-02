import React from 'react';
import { Clock, AlertTriangle, Flame, Tag, Utensils } from 'lucide-react';
import { MenuItem } from '../types';
import { Modal } from './Modal';

interface DishDetailsModalProps {
  item: MenuItem | null;
  categoryName?: string;
  onClose: () => void;
}

/**
 * Feature 4 — "Ver Detalhes" modal.
 * Full description, ingredients, allergens, nutritional info and preparation time.
 */
export const DishDetailsModal: React.FC<DishDetailsModalProps> = ({ item, categoryName, onClose }) => {
  if (!item) return <Modal open={false} onClose={onClose}><div /></Modal>;

  const ingredients = (item.ingredients || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <Modal open={!!item} onClose={onClose} maxWidth="max-w-2xl">
      {/* Header image */}
      <div className="relative h-56 shrink-0">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
            <Utensils size={56} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
      </div>

      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-3xl font-black tracking-tight text-zinc-900">{item.name}</h3>
            <span className="text-2xl font-black text-primary shrink-0">Kz{item.price.toFixed(2)}</span>
          </div>
          <p className="text-zinc-500 leading-relaxed">{item.description}</p>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-black/5">
            <div className="p-2.5 bg-white rounded-xl text-primary shadow-sm">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Preparação</p>
              <p className="text-sm font-bold text-zinc-900">
                {item.prepTimeMinutes ? `${item.prepTimeMinutes} min` : 'Rápida'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-black/5">
            <div className="p-2.5 bg-white rounded-xl text-primary shadow-sm">
              <Tag size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Categoria</p>
              <p className="text-sm font-bold text-zinc-900 truncate max-w-[120px]">{categoryName || 'Menu'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-black/5">
            <div className="p-2.5 bg-white rounded-xl text-primary shadow-sm">
              <Flame size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nutrição</p>
              <p className="text-sm font-bold text-zinc-900 truncate max-w-[120px]">{item.nutritionInfo || '—'}</p>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Ingredientes</h4>
          {ingredients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ingredients.map(ing => (
                <span key={ing} className="px-3 py-1.5 bg-zinc-100 rounded-full text-sm font-medium text-zinc-700">
                  {ing}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">Ingredientes em breve.</p>
          )}
        </div>

        {/* Allergens */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Alérgenos</h4>
          {item.allergens ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 font-medium">{item.allergens}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">Sem informação de alérgenos.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
