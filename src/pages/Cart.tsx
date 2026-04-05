import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Truck, Store, MessageCircle, ChevronLeft, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';
import { useSite } from '../SiteContext';

export const Cart: React.FC = () => {
  const { cart, total, removeFromCart, updateQuantity, clearCart } = useCart();
  const { settings } = useSite();
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');

  const deliveryFee = deliveryType === 'delivery' ? (settings?.deliveryFee || 2.5) : 0;
  const finalTotal = total + deliveryFee;

  const handleWhatsAppCheckout = () => {
    if (!name) {
      alert('Por favor, insira o seu nome.');
      return;
    }
    if (deliveryType === 'delivery' && !address) {
      alert('Por favor, insira o endereço de entrega.');
      return;
    }

    const orderItems = cart.map(item => {
      const extras = item.selectedExtras.map(e => e.name).join(', ');
      return `${item.quantity}x ${item.name}${extras ? ` (Extras: ${extras})` : ''} - Kz${((item.price + item.selectedExtras.reduce((s, e) => s + e.price, 0)) * item.quantity).toFixed(2)}`;
    }).join('\n');

    const message = `*Novo Pedido - Polaris Fast-Food*\n\n` +
      `*Cliente:* ${name}\n` +
      `*Tipo:* ${deliveryType === 'delivery' ? 'Entrega em Casa' : 'Retirada no Local'}\n` +
      `${deliveryType === 'delivery' ? `*Endereço:* ${address}\n` : ''}\n` +
      `*Itens:*\n${orderItems}\n\n` +
      `*Subtotal:* Kz${total.toFixed(2)}\n` +
      `*Taxa de Entrega:* Kz${deliveryFee.toFixed(2)}\n` +
      `*Total:* Kz${finalTotal.toFixed(2)}\n\n` +
      `_Por favor, confirme o meu pedido!_`;

    const whatsappUrl = `https://wa.me/${settings?.whatsapp?.replace(/\D/g, '') || '351999999999'}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    clearCart();
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-8">
        <div className="w-32 h-32 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-300">
          <ShoppingCart size={64} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-zinc-900">O seu carrinho está vazio</h2>
          <p className="text-zinc-500">Parece que ainda não adicionou nada ao seu pedido.</p>
        </div>
        <Link
          to="/menu"
          className="inline-flex items-center space-x-2 px-10 py-5 bg-primary text-white rounded-full font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20"
        >
          <ChevronLeft size={20} />
          <span>Explorar o Menu</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-4 mb-12">
        <Link to="/menu" className="p-2 bg-white border border-black/5 rounded-xl text-zinc-600 hover:text-primary transition-all">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900">O Seu Pedido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="popLayout">
            {cart.map((item) => (
              <motion.div
                layout
                key={`${item.id}-${JSON.stringify(item.selectedExtras)}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-[32px] shadow-xl shadow-black/5 border border-black/5 flex flex-col sm:flex-row items-center gap-6"
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-32 h-32 rounded-2xl object-cover" />
                ) : (
                  <div className="w-32 h-32 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400">
                    <Utensils size={32} />
                  </div>
                )}
                <div className="flex-grow space-y-2 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-zinc-900">{item.name}</h3>
                  {item.selectedExtras.length > 0 && (
                    <p className="text-xs font-medium text-primary uppercase tracking-widest">
                      Extras: {item.selectedExtras.map(e => e.name).join(', ')}
                    </p>
                  )}
                  <p className="text-zinc-500 text-sm line-clamp-1">{item.description}</p>
                  <p className="text-xl font-black text-zinc-900">
                    Kz{((item.price + item.selectedExtras.reduce((s, e) => s + e.price, 0)) * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center space-x-4 bg-zinc-50 p-2 rounded-2xl">
                  <button
                    onClick={() => updateQuantity(item.id, item.selectedExtras, item.quantity - 1)}
                    className="p-2 bg-white rounded-xl text-zinc-900 shadow-sm hover:bg-primary hover:text-white transition-all"
                  >
                    <Minus size={18} />
                  </button>
                  <motion.span 
                    key={item.quantity}
                    initial={{ scale: 1.2, color: '#F59E0B' }}
                    animate={{ scale: 1, color: '#18181b' }}
                    className="text-lg font-black w-6 text-center inline-block"
                  >
                    {item.quantity}
                  </motion.span>
                  <button
                    onClick={() => updateQuantity(item.id, item.selectedExtras, item.quantity + 1)}
                    className="p-2 bg-white rounded-xl text-zinc-900 shadow-sm hover:bg-primary hover:text-white transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id, item.selectedExtras)}
                  className="p-3 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Checkout Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-black/5 border border-black/5 space-y-8">
            <h2 className="text-2xl font-black text-zinc-900">Finalizar Pedido</h2>

            {/* Delivery Type */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Forma de Entrega</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryType('delivery')}
                  className={`flex flex-col items-center p-4 rounded-2xl border transition-all space-y-2 ${
                    deliveryType === 'delivery'
                    ? 'bg-secondary/10 border-secondary text-zinc-900 shadow-lg shadow-secondary/10'
                    : 'bg-white border-black/5 text-zinc-600 hover:border-secondary/50'
                  }`}
                >
                  <Truck size={24} />
                  <span className="text-xs font-bold">Entrega</span>
                </button>
                <button
                  onClick={() => setDeliveryType('pickup')}
                  className={`flex flex-col items-center p-4 rounded-2xl border transition-all space-y-2 ${
                    deliveryType === 'pickup'
                    ? 'bg-secondary/10 border-secondary text-zinc-900 shadow-lg shadow-secondary/10'
                    : 'bg-white border-black/5 text-zinc-600 hover:border-secondary/50'
                  }`}
                >
                  <Store size={24} />
                  <span className="text-xs font-bold">Retirada</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">O Seu Nome</label>
                <input
                  type="text"
                  placeholder="Como devemos chamá-lo?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                />
              </div>
              {deliveryType === 'delivery' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Endereço de Entrega</label>
                  <textarea
                    placeholder="Rua, Número, Bloco, etc."
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none"
                  />
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="space-y-4 pt-6 border-t border-black/5">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-bold">Kz{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Taxa de {deliveryType === 'delivery' ? 'Entrega' : 'Serviço'}</span>
                <span className="font-bold">Kz{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-zinc-900 pt-4">
                <span>Total</span>
                <span className="text-primary">Kz{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleWhatsAppCheckout}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3 group"
            >
              <MessageCircle size={24} />
              <span>Finalizar no WhatsApp</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="text-center text-xs text-zinc-400 px-8">
            Ao finalizar o pedido, será redirecionado para o nosso WhatsApp para confirmar os detalhes e o pagamento.
          </p>
        </div>
      </div>
    </div>
  );
};
