import React, { createContext, useContext, useEffect, useState } from 'react';

interface FavoritesContextType {
  /** Ids of dishes favourited by the user (persisted in localStorage) */
  favorites: string[];
  isFavorite: (dishId: string) => boolean;
  /** Toggles a dish and returns the new state (true = now favourite) */
  toggleFavorite: (dishId: string) => boolean;
}

const STORAGE_KEY = 'polaris_favorites';

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = (dishId: string) => favorites.includes(dishId);

  const toggleFavorite = (dishId: string) => {
    const nowFavorite = !favorites.includes(dishId);
    setFavorites(nowFavorite ? [...favorites, dishId] : favorites.filter(id => id !== dishId));
    return nowFavorite;
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
};
