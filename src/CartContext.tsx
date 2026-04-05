import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem } from './types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, selectedExtras: { name: string; price: number }[]) => void;
  removeFromCart: (itemId: string, selectedExtras: { name: string; price: number }[]) => void;
  updateQuantity: (itemId: string, selectedExtras: { name: string; price: number }[], quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error('Error parsing cart from localStorage:', err);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: MenuItem, quantity: number, selectedExtras: { name: string; price: number }[]) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(i => 
        i.id === item.id && 
        JSON.stringify(i.selectedExtras) === JSON.stringify(selectedExtras)
      );

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      }

      return [...prev, { ...item, quantity, selectedExtras }];
    });
  };

  const removeFromCart = (itemId: string, selectedExtras: { name: string; price: number }[]) => {
    setCart(prev => prev.filter(i => 
      !(i.id === itemId && JSON.stringify(i.selectedExtras) === JSON.stringify(selectedExtras))
    ));
  };

  const updateQuantity = (itemId: string, selectedExtras: { name: string; price: number }[], quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, selectedExtras);
      return;
    }
    setCart(prev => prev.map(i => 
      (i.id === itemId && JSON.stringify(i.selectedExtras) === JSON.stringify(selectedExtras))
        ? { ...i, quantity }
        : i
    ));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => {
    const extrasTotal = item.selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    return acc + (item.price + extrasTotal) * item.quantity;
  }, 0);

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
