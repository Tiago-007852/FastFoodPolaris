import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Package, Pencil, Check, X, ShieldAlert } from 'lucide-react';
import { profileApi, ordersApi } from '../lib/api';
import { useAuth } from '../AuthContext';
import type { Order, OrderStatus } from '../types';
import { ORDER_STATUS_LABELS } from '../types';
import { StatusBadge } from './Cart';
import { useToast } from '../components/ToastProvider';

/**
 * Perfil exclusivo do utilizador autenticado — os dados de contacto guardados
 * aqui pré-preenchem o checkout. As encomendas visíveis são todas e apenas as
 * da própria conta (autorizado no servidor por user_id).
 */
export const Profile: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({ fullName: '', phone: '', address: '', neighborhood: '' });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await profileApi.get();
      setProfile({ fullName: data.fullName, phone: data.phone, address: data.address, neighborhood: data.neighborhood });
      setEmail(data.email);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, load]);

  const loadOrders = useCallback(() => {
    ordersApi.mine()
      .then(setOrders)
      .catch(() => undefined)
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    if (user) loadOrders();
  }, [user, loadOrders]);

  if (authLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center text-zinc-400 font-bold">A carregar o seu perfil…</div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
        <ShieldAlert size={64} className="text-zinc-300 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-zinc-900">Precisa de iniciar sessão</h1>
          <p className="text-zinc-500">A página do perfil é exclusiva para utilizadores com conta.</p>
        </div>
        <Link to="/login" className="inline-block px-8 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover transition-colors">
          Iniciar sessão
        </Link>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await profileApi.update({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        neighborhood: profile.neighborhood.trim(),
      });
      showToast('Perfil atualizado com sucesso.', 'success');
      setEditing(false);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível guardar as alterações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <User size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">A minha conta</h1>
            <p className="text-sm text-zinc-500 flex items-center gap-1.5"><Mail size={13} /> {email}</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Pencil size={15} /> Editar dados
          </button>
        )}
      </header>

      <section className="bg-white rounded-3xl border border-black/5 shadow-lg shadow-black/5 p-6 sm:p-8 space-y-6">
        <h2 className="text-lg font-black text-zinc-900">Dados de contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Nome completo" Icon={User} value={profile.fullName} editing={editing} onChange={set('fullName')} />
          <Field
            label="Telefone"
            Icon={Phone}
            value={profile.phone}
            editing={editing}
            placeholder="9xx xxx xxx"
            invalid={!!profile.phone && !/^9\d{8}$/.test(profile.phone.replace(/\D/g, '').slice(-9))}
            onChange={set('phone')}
          />
          <Field label="Endereço habitual" Icon={MapPin} value={profile.address} editing={editing} onChange={set('address')} />
          <Field label="Bairro habitual" Icon={MapPin} value={profile.neighborhood} editing={editing} onChange={set('neighborhood')} />
        </div>
        {editing && (
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || (!!profile.phone && !/^9\d{8}$/.test(profile.phone.replace(/\D/g, '').slice(-9)))}
              className="px-6 py-3 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={16} /> {saving ? 'A guardar…' : 'Guardar'}
            </button>
            <button
              onClick={() => { setEditing(false); load(); }}
              className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        )}
        <p className="text-[11px] text-zinc-400">
          O email de acesso é o que utilizou no registo — para o alterar, utilize a recuperação de palavra-passe ou fale connosco.
        </p>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2"><Package size={20} className="text-primary" /> As minhas encomendas</h2>
          <button onClick={loadOrders} className="text-xs font-bold text-primary hover:underline">Atualizar</button>
        </div>

        {ordersLoading ? (
          <p className="text-zinc-400 text-sm font-bold">A carregar…</p>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-black/5 p-10 text-center space-y-3">
            <p className="font-bold text-zinc-700">Ainda não tem encomendas.</p>
            <Link to="/menu" className="inline-block text-sm font-black text-primary hover:underline">Explorar o menu →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-3xl border border-black/5 shadow-lg shadow-black/5 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-zinc-900">{order.reference}</p>
                    <p className="text-xs text-zinc-400">
                      {order.createdAt && new Date(order.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {' · '}{order.fulfillment === 'pickup' ? 'Levantamento' : `Entrega · ${order.neighborhood || '—'}`}
                      {order.paymentMethod && ` · ${order.paymentMethod === 'transfer' ? 'Transferência' : 'Express'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-zinc-900">Kz{order.total.toFixed(2)}</span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <OrderDetail order={order} />
                {(['pendente_pagamento', 'comprovativo_submetido'] as OrderStatus[]).includes(order.status) && (
                  <button
                    onClick={async () => {
                      try {
                        await ordersApi.cancel(order.id);
                        loadOrders();
                        showToast(`Encomenda ${order.reference} cancelada.`, 'info');
                      } catch (err: any) {
                        showToast(err?.message || 'Não foi possível cancelar.', 'error');
                      }
                    }}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Cancelar esta encomenda
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

/** Itens da encomenda expandíveis — poupam espaço na lista. */
const OrderDetail: React.FC<{ order: Order }> = ({ order }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="text-xs font-bold text-primary hover:underline">
        {open ? 'Esconder artigos' : `Ver artigos (${order.items.length})`}
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-4">
              <span className="text-zinc-600">{item.quantity}× {item.name}{item.extras.length ? ` (${item.extras.map(e => e.name).join(', ')})` : ''}</span>
              <span className="font-bold">{`Kz${item.lineTotal.toFixed(2)}`}</span>
            </div>
          ))}
          {order.proofReviewNote && (
            <p className="text-xs text-red-600 pt-1">Motivo da rejeição: {order.proofReviewNote}</p>
          )}
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  editing: boolean;
  placeholder?: string;
  invalid?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, Icon, value, editing, placeholder, invalid, onChange }) => (
  <div className="space-y-2">
    <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
      <Icon size={13} /> {label}
    </label>
    <input
      value={value}
      placeholder={placeholder}
      disabled={!editing}
      onChange={onChange}
      className={`w-full px-4 py-3 bg-zinc-50 border rounded-2xl text-sm transition-all ${
        invalid ? 'border-red-200 text-red-600' : 'border-black/5'
      } disabled:bg-zinc-50 disabled:text-zinc-700 focus:outline-none focus:border-primary`}
    />
  </div>
);

export default Profile;
