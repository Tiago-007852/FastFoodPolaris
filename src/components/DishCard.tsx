import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Heart, Info, Share2, ShoppingCart, SlidersHorizontal, Star, Utensils, Zap } from 'lucide-react';
import { MenuItem } from '../types';
import { useCart } from '../CartContext';
import { useSite } from '../SiteContext';
import { useFavorites } from '../FavoritesContext';
import { useToast } from './ToastProvider';
import { BadgeChip } from './BadgeChip';
import { StarRating } from './StarRating';

interface DishCardProps {
  item: MenuItem;
  categoryName?: string;
  onOpenDetails: (item: MenuItem) => void;
  onOpenCustomize: (item: MenuItem) => void;
  onOpenRating: (item: MenuItem) => void;
}

/**
 * Feature 4 — Interactive dish card.
 * Primary actions: "Pedir Agora" (add + go to checkout) and "Adicionar ao Carrinho" (add + toast).
 * Secondary actions: Avaliar, Partilhar (Web Share API), Favoritar, Ver Detalhes, Personalizar.
 * Indicators: badges (Mais Pedido / Novidade / Promoção / Esgotado), prep time,
 * availability and average star rating.
 */
export const DishCard: React.FC<DishCardProps> = ({
  item,
  categoryName,
  onOpenDetails,
  onOpenCustomize,
  onOpenRating,
}) => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { dishRatings } = useSite();
  const navigate = useNavigate();

  // Availability (missing field = available, safe default)
  const available = item.isAvailable !== false;
  const favorite = isFavorite(item.id);

  // Average rating from the live dishRatings subscription
  const ratings = dishRatings.filter(r => r.dishId === item.id && r.isHidden !== true);
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / ratings.length
    : 0;

  const shareUrl = `${window.location.origin}/menu?item=${item.id}`;

  // ---------- Actions ----------
  const handleAddToCart = () => {
    if (!available) {
      showToast('Este prato está esgotado.', 'error');
      return;
    }
    addToCart(item, 1, []);
    showToast(`${item.name} adicionado ao carrinho! 🛒`, 'success');
  };

  const handleOrderNow = () => {
    if (!available) {
      showToast('Este prato está esgotado.', 'error');
      return;
    }
    addToCart(item, 1, []);
    navigate('/carrinho');
  };

  const handleFavorite = () => {
    const nowFavorite = toggleFavorite(item.id);
    showToast(
      nowFavorite ? `${item.name} adicionado aos favoritos! ❤️` : `${item.name} removido dos favoritos.`,
      'info'
    );
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Polaris Fast-Food',
      text: `Vê este prato na Polaris Fast-Food: ${item.name} 🍔`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      throw new Error('share-unsupported');
    } catch (err) {
      // User cancelled the share sheet — do nothing
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Fallback: copy the direct link to the clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copiado para a área de transferência! 🔗', 'success');
      } catch {
        showToast('Não foi possível partilhar o link.', 'error');
      }
    }
  };

  // ---------- Badges (max 3 to avoid clutter; Esgotado always shown) ----------
  const badges: string[] = [];
  if (!available) badges.push('Esgotado');
  if (item.isPopular) badges.push('Mais Pedido');
  if (item.isNew) badges.push('Novidade');
  if (item.isPromo) badges.push('Promoção');
  const visibleBadges = badges.slice(0, 3);

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-black/5 border border-black/5 group hover:border-primary/30 transition-all flex flex-col">
      {/* Image + indicators */}
      <div className="relative h-56 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${!available ? 'grayscale opacity-60' : ''}`}
          />
        ) : (
          <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
            <Utensils size={48} />
          </div>
        )}

        {/* Badge system */}
        {visibleBadges.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-col items-start gap-1.5">
            {visibleBadges.map(b => (
              <BadgeChip key={b} label={b} />
            ))}
          </div>
        )}

        {/* Favorite heart */}
        <button
          onClick={handleFavorite}
          aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg backdrop-blur-md transition-all ${
            favorite
              ? 'bg-white text-red-500'
              : 'bg-white/90 text-zinc-400 hover:text-red-500'
          }`}
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>

        {/* Preparation time */}
        {item.prepTimeMinutes ? (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold">
            <Clock size={12} />
            {item.prepTimeMinutes} min
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col flex-grow space-y-3">
        <div className="flex justify-between items-start gap-3">
          <h3 className="text-xl font-bold text-zinc-900 leading-tight">{item.name}</h3>
          <span className="text-xl font-black text-primary shrink-0">Kz{item.price.toFixed(2)}</span>
        </div>

        {/* Average rating */}
        <div className="flex items-center gap-2">
          <StarRating value={avgRating} size={13} />
          <span className="text-xs font-bold text-zinc-500">
            {ratings.length > 0 ? `${avgRating.toFixed(1)} (${ratings.length})` : 'Sem avaliações'}
          </span>
        </div>

        <p className="text-zinc-500 text-sm line-clamp-2 flex-grow">{item.description}</p>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleOrderNow}
            disabled={!available}
            className={`py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
              available
                ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <Zap size={16} fill="currentColor" />
            <span>Pedir Agora</span>
          </button>
          <button
            onClick={handleAddToCart}
            disabled={!available}
            className={`py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
              available
                ? 'bg-zinc-100 text-zinc-900 hover:bg-primary hover:text-white'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <ShoppingCart size={16} />
            <span>Adicionar ao Carrinho</span>
          </button>
        </div>

        {/* Secondary actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => onOpenRating(item)}
            title="Avaliar Prato"
            aria-label="Avaliar Prato"
            className="p-2.5 rounded-xl text-zinc-500 hover:text-secondary hover:bg-secondary/10 transition-all"
          >
            <Star size={18} />
          </button>
          <button
            onClick={handleShare}
            title="Partilhar Prato"
            aria-label="Partilhar Prato"
            className="p-2.5 rounded-xl text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={handleFavorite}
            title="Favoritar"
            aria-label="Favoritar"
            className={`p-2.5 rounded-xl transition-all ${favorite ? 'text-red-500 bg-red-50' : 'text-zinc-500 hover:text-red-500 hover:bg-red-50'}`}
          >
            <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => onOpenDetails(item)}
            title="Ver Detalhes"
            aria-label="Ver Detalhes"
            className="p-2.5 rounded-xl text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Info size={18} />
          </button>
          <button
            onClick={() => onOpenCustomize(item)}
            title="Personalizar"
            aria-label="Personalizar"
            className="p-2.5 rounded-xl text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
