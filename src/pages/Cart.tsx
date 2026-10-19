import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Trash2, Plus, Minus, ChevronLeft, Utensils, MapPin, Phone,
  Truck, Store, FileText, Landmark, CheckCircle2, AlertCircle, Upload, RefreshCw, Ban,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';
import { useSite } from '../SiteContext';
import { useZones, formatEta } from '../ZonesContext';
import { ZoneSelector } from '../components/ZoneSelector';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../AuthContext';
import { ordersApi, profileApi } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import { ORDER_STATUS_LABELS } from '../types';

const stripDigits = (value: string | undefined) => (value?.replace(/\D/g, '') || '').replace(/^0/, '244');
const kz = (v: number) => `Kz${v.toFixed(2)}`;

/** Estados em que a encomenda já aceita comprovativo (clientes). */
const PROOF_ACCEPTING: OrderStatus[] = ['pendente_pagamento', 'comprovativo_submetido', 'pago_rejeitado'];

/**
 * Checkout completo (entrega ao domicílio + levantamento, pagamento por
 * transferência com validação server-side). Os totais apresentados depois da
 * submissão são sempre os devolvidos pela API, nunca os calculados no cliente.
 * WhatsApp mantém-se como canal de comunicação — nunca como confirmação.
 */
export const Cart: React.FC = () => {
  const { cart, total, removeFromCart, updateQuantity, clearCart } = useCart();
  const { settings } = useSite();
  const { areas, selectedArea, selectArea, selectedZone } = useZones();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Idempotência: um token por tentativa de checkout. */
  const clientTokenRef = useRef<string>('');
  const getToken = () => {
    if (!clientTokenRef.current) {
      clientTokenRef.current = (globalThis.crypto?.randomUUID?.() || `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    return clientTokenRef.current;
  };

  /** Pré-preenche com os dados guardados no perfil, quando a sessão existe. */
  useEffect(() => {
    let mounted = true;
    if (!user) return;
    profileApi.get().then((profile) => {
      if (!mounted) return;
      if (!name && profile.fullName) setName(profile.fullName);
      if (!phone && profile.phone) setPhone(profile.phone);
      if (!address && profile.address) setAddress(profile.address);
      if (!selectedArea && profile.neighborhood) {
        const known = areas.find(a => a.name.toLowerCase() === profile.neighborhood.toLowerCase());
        if (known) selectArea(known.name);
      }
    }).catch(() => undefined);
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const deliveryFee = fulfillment === 'pickup' ? 0 : (selectedZone?.fee ?? settings?.deliveryFee ?? 0);
  const finalTotal = total + deliveryFee;
  const canSubmit = cart.length > 0 && name.trim().length >= 2 && /^9\d{8}$/.test(phone.replace(/\D/g, '').slice(-9))
    && (fulfillment === 'pickup' || (selectedArea && address.trim().length >= 5));

  /* ----------------------------------------------------------- WhatsApp */

  const MAIN_WHATSAPP_DEFAULT = '+244 922 923 776';
  const GENERAL_WHATSAPP_DEFAULT = '+244 928 936 650';
  const mainDigits = stripDigits(settings?.whatsapp) || stripDigits(MAIN_WHATSAPP_DEFAULT);
  const generalDigits = stripDigits(settings?.contactPhone) || stripDigits(GENERAL_WHATSAPP_DEFAULT);

  const whatsappUrl = (digits: string) => {
    const rows = cart.map(item =>
      `${item.quantity}x ${item.name}${item.selectedExtras.length ? ` (Extras: ${item.selectedExtras.map(e => e.name).join(', ')})` : ''}`,
    );
    const message = [
      `*Pedido Polaris Fast-Food*`,
      `Cliente: ${name.trim() || '—'}`,
      fulfillment === 'pickup' ? 'Modalidade: Levantamento no estabelecimento' : `Entrega: ${selectedArea || '—'}${address.trim() ? ` — ${address.trim()}` : ''}`,
      '',
      ...rows,
      '',
      `Subtotal: ${kz(total)}`,
      fulfillment === 'pickup' ? 'Taxa de entrega: Kz0.00' : `Taxa de entrega: ${kz(deliveryFee)}`,
      `Total: ${kz(finalTotal)}`,
    ].join('\n');
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

  /* ---------------------------------------------------------- submissão */

  const submitOrder = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          sizeName: item.sizes?.[0]?.name ?? undefined,
          extraNames: item.selectedExtras.map(e => e.name),
        })),
        fulfillment,
        neighborhood: fulfillment === 'delivery' ? selectedArea : '',
        address: fulfillment === 'delivery' ? address.trim() : '',
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: user?.email || '',
        notes: notes.trim(),
        paymentMethod: 'transfer',
        clientToken: getToken(),
      });
      setReference(order.reference);
      setLastOrder(order);
      clearCart();
      clientTokenRef.current = '';
      showToast('Encomenda criada! Consulte o pagamento em baixo.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível criar a encomenda.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------- acompanhamento pós-envio */

  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [trackPhone, setTrackPhone] = useState('');
  const [tracking, setTracking] = useState(false);

  const refreshOrder = async () => {
    if (!reference) return;
    setTracking(true);
    try {
      const phoneForTrack = trackPhone || phone.trim();
      const order = user ? await ordersApi.mine().catch(() => ordersApi.track(reference, phoneForTrack || lastOrder?.customerPhone || ''))
        : await ordersApi.track(reference, phoneForTrack || lastOrder?.customerPhone || '');
      setLastOrder(order);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível obter o estado da encomenda.', 'error');
    } finally {
      setTracking(false);
    }
  };

  // Polling leve enquanto a encomenda aguarda pagamento (< 20 s — evita drenar a BD).
  useEffect(() => {
    if (!reference || !lastOrder || !PROOF_ACCEPTING.includes(lastOrder.status)) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshOrder();
    }, 20000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, lastOrder?.status]);

  const uploadProof = async (file: File) => {
    if (!lastOrder) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('O comprovativo excede o limite de 3 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const order = await ordersApi.uploadProof(lastOrder.id, {
          dataUrl: String(reader.result),
          filename: file.name,
          reference: lastOrder.reference,
          phone: phone.trim() || lastOrder.customerPhone,
        });
        setLastOrder(order);
        showToast('Comprovativo submetido. A equipa vai validar o pagamento.', 'success');
      } catch (err: any) {
        showToast(err?.message || 'Não foi possível anexar o comprovativo.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const cancelOrder = async () => {
    if (!lastOrder) return;
    try {
      const order = await ordersApi.cancel(lastOrder.id, { reference: lastOrder.reference, phone: phone.trim() || lastOrder.customerPhone });
      setLastOrder(order);
      showToast('Encomenda cancelada.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível cancelar.', 'error');
    }
  };

  /* --------------------------------------------------------------- render */

  if (cart.length === 0 && !reference) {
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
      <div className="flex items-center space-x-4 mb-4">
        <Link to="/menu" className="p-2 bg-white border border-black/5 rounded-xl text-zinc-600 hover:text-primary transition-all">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900">O Seu Pedido</h1>
      </div>
      <p className="text-zinc-500 mb-10 flex items-center gap-2">
        <MapPin size={16} className="text-primary" />
        Entregamos em todo o Huambo — ou levante o pedido na nossa loja, perto da estação PCH.
      </p>

      <AnimatePresence mode="wait">
        {lastOrder ? (
          <motion.div key="confirmation" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <OrderConfirmation
              order={lastOrder}
              onRefresh={refreshOrder}
              tracking={tracking}
              onUploadProof={uploadProof}
              onCancel={cancelOrder}
            />
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* ---- Coluna principal: formulário ---- */}
            <div className="lg:col-span-3 space-y-10">
              {cart.map((item) => (
                <motion.div
                  layout
                  key={`${item.id}-${JSON.stringify(item.selectedExtras)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 sm:p-6 rounded-3xl shadow-lg shadow-black/5 border border-black/5 flex items-center gap-4"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 shrink-0">
                      <Utensils size={28} />
                    </div>
                  )}
                  <div className="flex-grow min-w-0 space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 truncate">{item.name}</h3>
                    {item.selectedExtras.length > 0 && (
                      <p className="text-[11px] font-semibold text-primary uppercase tracking-wide truncate">
                        Extras: {item.selectedExtras.map(e => e.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm font-black text-zinc-900">
                      {item.quantity} × {kz(item.price + item.selectedExtras.reduce((s, e) => s + e.price, 0))}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 bg-zinc-50 p-1.5 rounded-xl shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, item.selectedExtras, item.quantity - 1)}
                      aria-label={`Menos um ${item.name}`}
                      className="p-2 bg-white rounded-lg text-zinc-900 hover:bg-primary hover:text-white transition-all"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-base font-black w-6 text-center inline-block">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.selectedExtras, item.quantity + 1)}
                      aria-label={`Mais um ${item.name}`}
                      className="p-2 bg-white rounded-lg text-zinc-900 hover:bg-primary hover:text-white transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id, item.selectedExtras)}
                    aria-label={`Remover ${item.name}`}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}

              {/* Modalidade */}
              <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-black/5 border border-black/5 space-y-5">
                <h2 className="text-lg font-black text-zinc-900">Modalidade</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { key: 'delivery', title: 'Entrega ao domicílio', desc: 'Taxa consoante o bairro, entrega em Huambo.', Icon: Truck },
                    { key: 'pickup', title: 'Levantamento na loja', desc: 'Sem taxa de entrega — perto da estação PCH.', Icon: Store },
                  ] as const).map(({ key, title, desc, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFulfillment(key)}
                      className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                        fulfillment === key
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-black/10 bg-white hover:border-primary/40'
                      }`}
                    >
                      <span className={`mt-0.5 p-2 rounded-xl ${fulfillment === key ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm font-black ${fulfillment === key ? 'text-primary' : 'text-zinc-900'}`}>{title}</span>
                        <span className="block text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {fulfillment === 'pickup' && (
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5 space-y-2 text-sm">
                    <p className="font-bold text-zinc-900 flex items-center gap-2"><Store size={16} className="text-primary" /> Local de levantamento</p>
                    <p className="text-zinc-600">{settings?.pickupLocation || 'Arredores da estação PCH, Huambo, Angola'}</p>
                    <p className="text-xs text-zinc-400">Pode levantar a encomenda assim que o pagamento for validado — confirmamos-lhe por WhatsApp.</p>
                  </div>
                )}

                {fulfillment === 'delivery' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Bairro (obrigatório)</h3>
                    <ZoneSelector variant="dropdown" />
                    <div className="space-y-2">
                      <label htmlFor="checkout-address" className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Endereço completo</label>
                      <textarea
                        id="checkout-address"
                        placeholder="Rua, número, casa/apartamento, ponto de referência…"
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-3.5 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none text-sm"
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Dados do cliente */}
              <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-black/5 border border-black/5 space-y-5">
                <h2 className="text-lg font-black text-zinc-900">Dados do cliente</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="checkout-name" className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Nome completo *</label>
                    <input
                      id="checkout-name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3.5 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="checkout-phone" className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Telefone *</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                      <input
                        id="checkout-phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="9xx xxx xxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="checkout-notes" className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Notas (opcional)</label>
                  <input
                    id="checkout-notes"
                    type="text"
                    placeholder="Sem picles, entregar na recepção…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all text-sm"
                  />
                </div>
                {!user && (
                  <p className="text-xs text-zinc-400">
                    Está a encomendar como visitante.{' '}
                    <Link to="/login?returnTo=/carrinho" className="font-bold text-primary hover:underline">Inicie sessão</Link> para guardar os dados
                    e consultar o histórico em <Link to="/perfil" className="font-bold text-primary hover:underline">/perfil</Link>.
                  </p>
                )}
              </section>

              {/* Pagamento */}
              <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-black/5 border border-black/5 space-y-5">
                <h2 className="text-lg font-black text-zinc-900">Pagamento</h2>
                <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-2">
                  <p className="flex items-center gap-2 text-sm font-black text-primary"><Landmark size={16} /> Transferência bancária</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Depois de criar a encomenda, transfira o valor exato para a conta da Polaris e
                    anexe o comprovativo. A encomenda fica <strong>pendente</strong> até à validação da nossa equipa.
                  </p>
                  {(settings?.bankName || settings?.bankAccountNumber) ? (
                    <dl className="text-sm space-y-1.5 pt-2">
                      <div className="flex gap-2"><dt className="text-zinc-500 font-medium">Banco:</dt><dd className="font-bold text-zinc-900">{settings.bankName}</dd></div>
                      <div className="flex gap-2"><dt className="text-zinc-500 font-medium">Titular:</dt><dd className="font-bold text-zinc-900">{settings.bankAccountHolder || 'Polaris Fast-Food'}</dd></div>
                      <div className="flex gap-2"><dt className="text-zinc-500 font-medium">IBAN:</dt><dd className="font-bold text-zinc-900">{settings.bankAccountNumber}</dd></div>
                    </dl>
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      Os dados bancários serão confirmados pela Polaris. Enquanto não estiverem publicados, confirme os dados no WhatsApp antes de transferir.
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-2xl border border-black/10 bg-zinc-50 opacity-70">
                  <p className="flex items-center gap-2 text-sm font-bold text-zinc-500"><FileText size={16} /> Pagamento eletrónico Express</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Ainda indisponível — em integração com o fornecedor oficial. Pague por transferência.</p>
                </div>
              </section>
            </div>

            {/* ---- Coluna secundária: resumo + ação ---- */}
            <aside className="lg:col-span-2">
              <div className="lg:sticky lg:top-36 space-y-4">
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/5 border border-black/5 space-y-4">
                  <h2 className="text-xl font-black text-zinc-900">Resumo do pedido</h2>
                  <div className="space-y-3 text-sm">
                    <Row label="Subtotal" value={kz(total)} />
                    {fulfillment === 'delivery' ? (
                      <>
                        <Row
                          label={`Taxa de entrega${selectedArea ? ` · ${selectedArea}` : ''}`}
                          value={selectedArea ? kz(deliveryFee) : 'escolha o bairro'}
                          muted={!selectedArea}
                        />
                        {selectedZone && (
                          <Row label="Tempo estimado" value={formatEta(selectedZone)} muted />
                        )}
                      </>
                    ) : (
                      <Row label="Taxa de entrega" value="Kz0.00 (levantamento)" muted />
                    )}
                    <Row label="Modalidade" value={fulfillment === 'pickup' ? 'Levantamento na loja' : `Entrega · ${selectedArea || '—'}`} muted />
                    <Row label="Pagamento" value="Transferência bancária" muted />
                    <div className="border-t border-black/5 pt-3 flex justify-between text-xl font-black text-zinc-900">
                      <span>Total</span>
                      <span className="text-primary">{kz(finalTotal)}</span>
                    </div>
                  </div>
                  <button
                    onClick={submitOrder}
                    disabled={!canSubmit || submitting}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'A processar…' : 'Finalizar encomenda'}
                  </button>
                  {fulfillment === 'delivery' && !selectedArea && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">Selecione o bairro para continuar.</p>
                  )}
                  {fulfillment === 'delivery' && selectedArea && address.trim().length < 5 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">Falta o endereço completo de entrega.</p>
                  )}
                  {phone.trim() && !/^9\d{8}$/.test(phone.replace(/\D/g, '').slice(-9)) && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">Telefone de Angola 9xx xxx xxx.</p>
                  )}
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Os preços e a taxa são confirmados no servidor. A encomenda só é considerada paga depois da validação real do pagamento.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg shadow-black/5 border border-black/5 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Atendimento via WhatsApp</p>
                  <a
                    href={whatsappUrl(mainDigits)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl hover:bg-emerald-100 transition-all text-left"
                  >
                    <span className="p-2.5 bg-emerald-500 text-white rounded-xl shrink-0"><PhoneIcon /></span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-700">WhatsApp pedidos</span>
                      <span className="block text-sm font-black text-zinc-900 truncate">{settings?.whatsapp || MAIN_WHATSAPP_DEFAULT}</span>
                    </span>
                  </a>
                  <a
                    href={`https://wa.me/${generalDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3.5 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl hover:bg-emerald-100 transition-all text-left"
                  >
                    <span className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0"><PhoneIcon /></span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-700">{settings?.contactPhoneLabel || 'WhatsApp geral'}</span>
                      <span className="block text-sm font-black text-zinc-900 truncate">{settings?.contactPhone || GENERAL_WHATSAPP_DEFAULT}</span>
                    </span>
                  </a>
                </div>
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PhoneIcon: React.FC = () => {
  // Marca clara: balão de fala verde igual em ambos os botões.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z" />
    </svg>
  );
};

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="text-zinc-500">{label}</span>
    <span className={muted ? 'font-bold text-zinc-400 text-right' : 'font-bold text-zinc-900 text-right'}>{value}</span>
  </div>
);

/**
 * Confirmação pós-encomenda: referência, estado vivo, transferência a efectuar,
 * anexo do comprovativo e canal WhatsApp para comunicar — nada disto decide
 * pagamento no browser.
 */
const OrderConfirmation: React.FC<{
  order: Order;
  onRefresh: () => void;
  tracking: boolean;
  onUploadProof: (file: File) => void;
  onCancel: () => void;
}> = ({ order, onRefresh, tracking, onUploadProof, onCancel }) => {
  const { settings } = useSite();
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-[32px] shadow-2xl shadow-black/5 border border-black/5 overflow-hidden">
      <div className="p-6 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Encomenda</p>
            <h2 className="text-3xl font-black text-zinc-900">{order.reference}</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {order.fulfillment === 'pickup' ? 'Levantamento na loja' : `Entrega · ${order.neighborhood || ''}`}
              {order.createdAt && ` · ${new Date(order.createdAt).toLocaleString('pt-PT')}`}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === 'pago_rejeitado' && order.proofReviewNote && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span><strong>Comprovativo rejeitado:</strong> {order.proofReviewNote} Pode submeter um novo comprovativo em baixo.</span>
          </p>
        )}

        <div className="space-y-3 text-sm">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-4">
              <span className="text-zinc-600">
                {item.quantity}× {item.name}
                {item.extras.length > 0 && ` (Extras: ${item.extras.map(e => e.name).join(', ')})`}
              </span>
              <span className="font-bold text-zinc-900">{kz(item.lineTotal)}</span>
            </div>
          ))}
          <div className="border-t border-black/5 pt-3 space-y-1.5">
            <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span className="font-bold">{kz(order.subtotal)}</span></div>
            <div className="flex justify-between text-zinc-600">
              <span>Taxa de entrega{order.zoneName ? ` (${order.zoneName})` : ''}</span>
              <span className="font-bold">{order.fulfillment === 'pickup' ? 'Kz0.00' : kz(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-zinc-900 pt-1">
              <span>Total</span><span className="text-primary">{kz(order.total)}</span>
            </div>
          </div>
        </div>

        {order.paymentMethod === 'transfer' && PROOF_ACCEPTING.includes(order.status) && (
          <div className="p-5 rounded-2xl bg-zinc-50 border border-black/5 space-y-3">
            <p className="font-bold text-zinc-900 flex items-center gap-2"><Landmark size={16} className="text-primary" /> Transferência bancária</p>
            <p className="text-sm text-zinc-600">
              Transfira <strong>{kz(order.total)}</strong> e indique a referência
              {' '}<strong>{order.reference}</strong>. Assim que a transferência sair, anexe o comprovativo:
            </p>
            {(settings?.bankName || settings?.bankAccountNumber) && (
              <p className="text-sm text-zinc-700">
                {settings.bankName && <span className="font-bold">{settings.bankName} · </span>}
                {settings.bankAccountHolder && <span>{settings.bankAccountHolder} · </span>}
                {settings.bankAccountNumber && <span className="font-bold">{settings.bankAccountNumber}</span>}
              </p>
            )}
            <label className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-dashed border-zinc-300 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-sm font-bold text-zinc-600">
              <Upload size={16} />
              {order.proofStatus ? 'Submeter novo comprovativo (jpg, png, webp ou pdf · 3 MB)' : 'Anexar comprovativo (jpg, png, webp ou pdf · 3 MB)'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) onUploadProof(file); e.currentTarget.value = ''; }}
              />
            </label>
            {order.proofStatus === 'pendente' && (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={14} /> Comprovativo submetido — aguarda validação da equipa.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onRefresh}
            disabled={tracking}
            className="px-5 py-3 rounded-2xl bg-zinc-100 text-zinc-800 font-bold text-sm hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={15} className={tracking ? 'animate-spin' : ''} /> Atualizar estado
          </button>
          {(['pendente_pagamento', 'comprovativo_submetido'] as OrderStatus[]).includes(order.status) && (
            <button
              onClick={onCancel}
              className="px-5 py-3 rounded-2xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <Ban size={15} /> Cancelar encomenda
            </button>
          )}
          {user && (
            <Link to="/perfil" className="px-5 py-3 rounded-2xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex items-center gap-2">
              Ver todas as minhas encomendas
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const palette: Record<string, string> = {
    pendente_pagamento: 'bg-amber-100 text-amber-800',
    comprovativo_submetido: 'bg-sky-100 text-sky-800',
    pago: 'bg-emerald-100 text-emerald-800',
    em_preparacao: 'bg-orange-100 text-orange-800',
    em_entrega: 'bg-blue-100 text-blue-800',
    pronto_para_levantamento: 'bg-blue-100 text-blue-800',
    concluido: 'bg-zinc-200 text-zinc-700',
    cancelado: 'bg-zinc-200 text-zinc-600',
    pago_rejeitado: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide ${palette[status] || 'bg-zinc-100 text-zinc-700'}`}>
      {ORDER_STATUS_LABELS[status] || status}
    </span>
  );
};
