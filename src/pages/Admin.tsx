import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, Trash2, Edit2, Save, X, LogIn, LayoutGrid, Utensils, Star, Image as ImageIcon, Check, AlertCircle, Upload, Users, Phone, MonitorPlay, MapPin, Power, Eye, EyeOff, RotateCcw, Sparkles } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSite } from '../SiteContext';
import { useZones, DEFAULT_ZONES, formatEta } from '../ZonesContext';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../lib/api';
import { Category, MenuItem, SiteSettings, Review, GalleryImage, TeamMember, AboutContent, Banner, DeliveryZone, DishRating, Teaser } from '../types';
import { ImageUpload } from '../components/ImageUpload';

/** Admin panel data helpers — every write goes to the Postgres API now. */
const logError = (err: unknown, path: string) => console.error(`API error on ${path}`, err);

/** Admin panel uses Firestore collection names; the API resource names differ for zones. */
const resourceOf = (collection: string) => (collection === 'deliveryZones' ? 'zones' : collection);

export const Admin: React.FC = () => {
  const { user, isAdmin, loading: authLoading, refresh: refreshAuth } = useAuth();
  const { categories, menuItems, settings, reviews, gallery, team, about, banners, dishRatings, teasers, loading: siteLoading } = useSite();
  const { zones } = useZones();
  const [activeTab, setActiveTab] = useState<'settings' | 'categories' | 'menu' | 'banners' | 'teasers' | 'zones' | 'reviews' | 'ratings' | 'gallery' | 'about' | 'users' | 'contacts'>('settings');
  const [users, setUsers] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [tempImage, setTempImage] = useState<string>('');
  const [tempImage2, setTempImage2] = useState<string>('');
  const [extras, setExtras] = useState<{ name: string; price: number }[]>([]);
  const [sizes, setSizes] = useState<{ name: string; price: number }[]>([]);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      const fetchUsers = async () => {
        try {
          setUsers(await apiGet<any[]>('/users'));
        } catch (err) {
          logError(err, '/users');
        }
      };
      fetchUsers();
    }
  }, [activeTab, isAdmin]);

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await apiPatch(`/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setStatus({ type: 'success', message: 'Permissão atualizada!' });
    } catch (err) {
      logError(err, `/users/${userId}/role`);
      setStatus({ type: 'error', message: 'Erro ao atualizar permissão.' });
    }
  };

  const handleSeed = async () => {
    if (confirm('Deseja resetar o menu? Isso irá apagar os itens atuais e carregar a nova lista de produtos (Hambúrgueres, Bebidas, Sobremesas, etc).')) {
      setIsSeeding(true);
      try {
        await apiPost('/seed');
        setStatus({ type: 'success', message: 'Menu atualizado com sucesso!' });
      } catch (err) {
        logError(err, '/seed');
        setStatus({ type: 'error', message: 'Erro ao atualizar o menu.' });
      } finally {
        setIsSeeding(false);
      }
    }
  };

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (isModalOpen && editingItem) {
      if (activeTab === 'gallery') {
        setTempImage(editingItem.url || '');
      } else if (activeTab === 'banners') {
        setTempImage(editingItem.mediaUrl || '');
      } else if (activeTab === 'teasers') {
        setTempImage(editingItem.image || '');
      } else if (activeTab === 'zones') {
        setTempImage('');
      } else if (activeTab === 'about' && editingItem.name) { // Team member
        setTempImage(editingItem.image || '');
      } else {
        setTempImage(editingItem.image || '');
      }
      setExtras(editingItem.extras || []);
      setSizes(editingItem.sizes || []);
    } else if (!isModalOpen) {
      setTempImage('');
      setTempImage2('');
      setExtras([]);
      setSizes([]);
    }
  }, [isModalOpen, editingItem, activeTab]);

  useEffect(() => {
    if (activeTab === 'settings' && settings) {
      setTempImage(settings.heroImage || '');
    } else if (activeTab === 'about' && about) {
      setTempImage(about.heroImage || '');
      setTempImage2(about.storyImage || '');
    }
  }, [activeTab, settings, about]);

  if (authLoading || siteLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-8">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
          <AlertCircle size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-zinc-900">Acesso Restrito</h2>
          <p className="text-zinc-500">Apenas administradores autorizados podem aceder a esta página.</p>
        </div>
        {!user?.email && (
          <div className="space-y-4">
            <Link
              to="/login"
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3"
            >
              <LogIn size={24} />
              <span>Entrar como Admin</span>
            </Link>
            <p className="text-xs text-zinc-400">
              Inicie sessão com o email e palavra-passe da conta de administrador.
            </p>
          </div>
        )}
      </div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const updateData: any = { ...data };
      if (updateData.deliveryFee) updateData.deliveryFee = Number(updateData.deliveryFee);
      if (tempImage && activeTab === 'settings') updateData.heroImage = tempImage;

      // Countdown settings (Feature 6) — only in the settings tab (the contacts form shares this handler)
      if (activeTab === 'settings') {
        updateData.countdownEnabled = formData.get('countdownEnabled') === 'on';
        const countdownRaw = formData.get('countdownTargetDate') as string;
        // datetime-local is Angola local time (UTC+1) — convert to ISO
        if (countdownRaw) updateData.countdownTargetDate = new Date(`${countdownRaw}:00+01:00`).toISOString();
      }

      await apiPut('/settings/main', updateData);
      setStatus({ type: 'success', message: 'Definições guardadas com sucesso!' });
    } catch (err) {
      logError(err, '/settings/main');
      setStatus({ type: 'error', message: 'Erro ao guardar definições.' });
    }
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      order: Number(formData.get('order'))
    };

    try {
      if (editingItem?.id) {
        await apiPut(`/categories/${editingItem.id}`, data);
      } else {
        await apiPost('/categories', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Categoria guardada!' });
    } catch (err) {
      logError(err, 'categories');
      setStatus({ type: 'error', message: 'Erro ao guardar categoria.' });
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const validExtras = extras.filter(e => e.name.trim() !== '');
    const validSizes = sizes.filter(s => s.name.trim() !== '');
    const prepTime = Number(formData.get('prepTimeMinutes')) || 0;

    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      image: tempImage,
      categoryId: formData.get('categoryId') as string,
      isPopular: formData.get('isPopular') === 'on',
      isPromo: formData.get('isPromo') === 'on',
      isNew: formData.get('isNew') === 'on',
      isAvailable: formData.get('isAvailable') === 'on',
      prepTimeMinutes: prepTime > 0 ? prepTime : null,
      ingredients: ((formData.get('ingredients') as string) || '').trim(),
      allergens: ((formData.get('allergens') as string) || '').trim(),
      nutritionInfo: ((formData.get('nutritionInfo') as string) || '').trim(),
      sizes: validSizes,
      extras: validExtras
    };

    try {
      if (editingItem?.id) {
        await apiPut(`/menuItems/${editingItem.id}`, data);
      } else {
        await apiPost('/menuItems', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Prato guardado!' });
    } catch (err) {
      logError(err, 'menuItems');
      setStatus({ type: 'error', message: 'Erro ao guardar prato.' });
    }
  };

  const handleSaveAbout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      heroImage: tempImage,
      storyTitle: formData.get('storyTitle') as string,
      storySubtitle: formData.get('storySubtitle') as string,
      storyText1: formData.get('storyText1') as string,
      storyText2: formData.get('storyText2') as string,
      storyImage: tempImage2,
      quote: formData.get('quote') as string,
      quoteAuthor: formData.get('quoteAuthor') as string,
    };

    try {
      await apiPut('/about/about', data);
      setStatus({ type: 'success', message: 'Conteúdo "Sobre Nós" guardado!' });
    } catch (err) {
      logError(err, '/about/about');
      setStatus({ type: 'error', message: 'Erro ao guardar conteúdo.' });
    }
  };

  const handleSaveGallery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      url: tempImage,
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      order: Number(formData.get('order')),
    };

    try {
      if (editingItem?.id) {
        await apiPut(`/gallery/${editingItem.id}`, data);
      } else {
        await apiPost('/gallery', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Imagem da galeria guardada!' });
    } catch (err) {
      logError(err, 'gallery');
      setStatus({ type: 'error', message: 'Erro ao guardar imagem.' });
    }
  };

  const handleSaveTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      image: tempImage,
      order: Number(formData.get('order')),
    };

    try {
      if (editingItem?.id) {
        await apiPut(`/team/${editingItem.id}`, data);
      } else {
        await apiPost('/team', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Membro da equipa guardado!' });
    } catch (err) {
      logError(err, 'team');
      setStatus({ type: 'error', message: 'Erro ao guardar membro.' });
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (coll === 'users') {
      setStatus({ type: 'error', message: 'Contas de utilizadores não podem ser eliminadas daqui.' });
      return;
    }
    if (confirm('Tem a certeza que deseja eliminar este item?')) {
      try {
        await apiDelete(`/${resourceOf(coll)}/${id}`);
        setStatus({ type: 'success', message: 'Item eliminado!' });
      } catch (err) {
        logError(err, `${coll}/${id}`);
        setStatus({ type: 'error', message: 'Erro ao eliminar item.' });
      }
    }
  };

  // ======================= Feature 1: Banner Manager =======================

  const handleSaveBanner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      title: formData.get('title') as string,
      subtitle: ((formData.get('subtitle') as string) || '').trim(),
      mediaUrl: tempImage,
      mediaType: ((formData.get('mediaType') as string) || 'image') as 'image' | 'video',
      ctaLabel: ((formData.get('ctaLabel') as string) || '').trim(),
      ctaLink: ((formData.get('ctaLink') as string) || '/menu').trim(),
      badge: ((formData.get('badge') as string) || '') as Banner['badge'],
      placement: ((formData.get('placement') as string) || 'both') as Banner['placement'],
      order: Number(formData.get('order')) || 0,
      active: formData.get('active') === 'on',
      activeFrom: ((formData.get('activeFrom') as string) || '').trim(),
      activeTo: ((formData.get('activeTo') as string) || '').trim(),
    };

    if (!data.mediaUrl) {
      setStatus({ type: 'error', message: 'Adicione a imagem ou vídeo do banner (URL ou upload).' });
      return;
    }

    try {
      if (editingItem?.id) {
        await apiPut(`/banners/${editingItem.id}`, data);
      } else {
        await apiPost('/banners', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Banner guardado!' });
    } catch (err) {
      logError(err, 'banners');
      setStatus({ type: 'error', message: 'Erro ao guardar banner.' });
    }
  };

  const handleToggleBannerActive = async (banner: Banner) => {
    try {
      await apiPatch(`/banners/${banner.id}`, { active: !banner.active });
      setStatus({ type: 'success', message: banner.active ? 'Banner desativado!' : 'Banner ativado!' });
    } catch (err) {
      logError(err, `banners/${banner.id}`);
      setStatus({ type: 'error', message: 'Erro ao atualizar banner.' });
    }
  };

  // ======================= Countdown teaser cards =======================

  const handleSaveTeaser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      name: ((formData.get('name') as string) || '').trim(),
      description: ((formData.get('description') as string) || '').trim(),
      image: tempImage,
      order: Number(formData.get('order')) || 0,
      enabled: formData.get('enabled') === 'on',
    };

    if (!data.name) {
      setStatus({ type: 'error', message: 'Dê um título à prévia.' });
      return;
    }

    try {
      if (editingItem?.id) {
        await apiPut(`/teasers/${editingItem.id}`, data);
      } else {
        await apiPost('/teasers', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Prévia guardada!' });
    } catch (err) {
      logError(err, 'teasers');
      setStatus({ type: 'error', message: 'Erro ao guardar prévia.' });
    }
  };

  const handleToggleTeaser = async (teaser: Teaser) => {
    try {
      await apiPatch(`/teasers/${teaser.id}`, { enabled: teaser.enabled === false });
      setStatus({ type: 'success', message: teaser.enabled === false ? 'Prévia ativada!' : 'Prévia desativada!' });
    } catch (err) {
      logError(err, `teasers/${teaser.id}`);
      setStatus({ type: 'error', message: 'Erro ao atualizar prévia.' });
    }
  };

  // ======================= Feature 3: Zone Manager =======================

  const handleSaveZone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get('name') as string,
      fee: Number(formData.get('fee')) || 0,
      timeMin: Number(formData.get('timeMin')) || 0,
      timeMax: Number(formData.get('timeMax')) || 0,
      neighborhoods: ((formData.get('neighborhoods') as string) || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      order: Number(formData.get('order')) || 0,
      enabled: formData.get('enabled') === 'on',
    };

    try {
      if (editingItem?.id) {
        // PUT so default (non-persisted) zones can be saved in place
        await apiPut(`/zones/${editingItem.id}`, data);
      } else {
        await apiPost('/zones', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Zona guardada!' });
    } catch (err) {
      logError(err, 'zones');
      setStatus({ type: 'error', message: 'Erro ao guardar zona.' });
    }
  };

  /** Enable/disable a zone. Default zones (not yet in the database) are persisted on first toggle. */
  const handleToggleZoneEnabled = async (zone: DeliveryZone) => {
    try {
      await apiPut(`/zones/${zone.id}`, { ...zone, enabled: !zone.enabled });
      setStatus({ type: 'success', message: zone.enabled ? 'Zona desativada!' : 'Zona ativada!' });
    } catch (err) {
      logError(err, `zones/${zone.id}`);
      setStatus({ type: 'error', message: 'Erro ao atualizar zona.' });
    }
  };

  const handleRestoreDefaultZones = async () => {
    if (!confirm('Restaurar as 6 zonas padrão de Huambo? Isto substitui as zonas atualmente configuradas.')) return;
    try {
      for (const zone of DEFAULT_ZONES) {
        const { id, ...zoneData } = zone;
        await apiPut(`/zones/${id}`, zoneData);
      }
      setStatus({ type: 'success', message: 'Zonas padrão restauradas!' });
    } catch (err) {
      logError(err, 'zones');
      setStatus({ type: 'error', message: 'Erro ao restaurar zonas.' });
    }
  };

  // ======================= Feature 4: Dish availability toggle =======================

  const handleToggleDishAvailability = async (item: MenuItem) => {
    const newState = item.isAvailable === false; // currently sold out -> becomes available
    try {
      await apiPatch(`/menuItems/${item.id}`, { isAvailable: newState });
      setStatus({ type: 'success', message: newState ? 'Prato marcado como disponível!' : 'Prato marcado como esgotado!' });
    } catch (err) {
      logError(err, `menuItems/${item.id}`);
      setStatus({ type: 'error', message: 'Erro ao atualizar disponibilidade.' });
    }
  };

  // ======================= Feature 4: Dish ratings moderation =======================

  const handleToggleDishRatingHidden = async (rating: DishRating) => {
    try {
      await apiPatch(`/dishRatings/${rating.id}`, { isHidden: !rating.isHidden });
      setStatus({ type: 'success', message: rating.isHidden ? 'Avaliação reactivada!' : 'Avaliação oculta!' });
    } catch (err) {
      logError(err, `dishRatings/${rating.id}`);
      setStatus({ type: 'error', message: 'Erro ao atualizar avaliação.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Painel Admin</h1>
          <p className="text-zinc-500">Gerencie o conteúdo do seu site em tempo real.</p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {isSeeding ? 'A atualizar...' : 'Resetar/Atualizar Menu'}
          </button>

          {/* Status Toast */}
          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`px-6 py-3 rounded-2xl text-white font-bold flex items-center space-x-2 shadow-xl ${
                  status.type === 'success' ? 'bg-primary' : 'bg-red-500'
                }`}
              >
                {status.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                <span>{status.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-8 mb-8 no-scrollbar gap-4">
        {[
          { id: 'settings', label: 'Geral', icon: <Settings size={18} /> },
          { id: 'contacts', label: 'Contactos', icon: <Phone size={18} /> },
          { id: 'categories', label: 'Categorias', icon: <LayoutGrid size={18} /> },
          { id: 'menu', label: 'Menu', icon: <Utensils size={18} /> },
          { id: 'banners', label: 'Banners', icon: <MonitorPlay size={18} /> },
          { id: 'teasers', label: 'Prévias', icon: <Sparkles size={18} /> },
          { id: 'zones', label: 'Zonas', icon: <MapPin size={18} /> },
          { id: 'gallery', label: 'Galeria', icon: <ImageIcon size={18} /> },
          { id: 'about', label: 'Sobre Nós', icon: <Users size={18} /> },
          { id: 'reviews', label: 'Avaliações', icon: <Star size={18} /> },
          { id: 'ratings', label: 'Notas de Pratos', icon: <Star size={18} /> },
          { id: 'users', label: 'Utilizadores', icon: <Users size={18} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-8 py-3 rounded-full font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id 
              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
              : 'bg-white text-zinc-600 border border-black/5 hover:border-primary/30'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-[40px] p-8 border border-black/5 shadow-2xl shadow-black/5">
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome do Restaurante</label>
                <input name="restaurantName" defaultValue={settings?.restaurantName} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Slogan</label>
                <input name="slogan" defaultValue={settings?.slogan} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Taxa de Entrega (Kz)</label>
                <input name="deliveryFee" type="number" step="0.01" defaultValue={settings?.deliveryFee} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Horário</label>
                <input name="openingHours" defaultValue={settings?.openingHours} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Hero Image URL</label>
                <input 
                  name="heroImage" 
                  value={tempImage} 
                  onChange={(e) => setTempImage(e.target.value)}
                  className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" 
                />
              </div>
              <ImageUpload 
                label="Ou faça upload de uma imagem" 
                currentImage={tempImage} 
                onUpload={setTempImage} 
              />
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Data do Lançamento (Countdown)</label>
                <input
                  name="countdownTargetDate"
                  type="datetime-local"
                  defaultValue={settings?.countdownTargetDate
                    ? new Date(settings.countdownTargetDate).toLocaleString('sv-SE', { timeZone: 'Africa/Luanda' }).slice(0, 16).replace(' ', 'T')
                    : '2026-10-09T09:00'}
                  className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                />
                <p className="text-[11px] text-zinc-400">Hora local de Angola (UTC+1). Após esta data, o site mostra o banner "Já estamos a entregar!".</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Vídeo de Fundo da Contagem (MP4)</label>
                <input
                  name="countdownBgVideo"
                  defaultValue={settings?.countdownBgVideo || ''}
                  placeholder="/videos/countdown-bg.mp4 ou https://.../video.mp4"
                  className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                />
                <p className="text-[11px] text-zinc-400">
                  Vídeo que aparece no fundo da contagem regressiva. Usa "/videos/countdown-bg.mp4" se deixares o campo vazio.
                </p>
              </div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" name="countdownEnabled" defaultChecked={settings?.countdownEnabled !== false} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                <span className="text-sm font-bold text-zinc-900">Mostrar contagem decrescente no site</span>
              </label>
            </div>
            <div className="md:col-span-2 pt-6">
              <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all flex items-center justify-center space-x-3">
                <Save size={24} />
                <span>Guardar Definições</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'contacts' && (
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Telefone</label>
                <input name="phone" defaultValue={settings?.phone} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">WhatsApp</label>
                <input name="whatsapp" defaultValue={settings?.whatsapp} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                <p className="text-[11px] text-zinc-400">WhatsApp para pedidos.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">WhatsApp Geral</label>
                <input name="contactPhone" defaultValue={settings?.contactPhone} placeholder="+244 928 936 650"
                  className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                <p className="text-[11px] text-zinc-400">Segundo número de WhatsApp (atendimento geral). Deixe vazio se não quiser mostrar.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Etiqueta do WhatsApp Geral</label>
                <input name="contactPhoneLabel" defaultValue={settings?.contactPhoneLabel || 'WhatsApp geral'}
                  className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                <p className="text-[11px] text-zinc-400">Texto que aparece ao lado do WhatsApp geral (ex.: "WhatsApp geral").</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Email</label>
                <input name="email" defaultValue={settings?.email} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Instagram</label>
                <input name="instagram" defaultValue={settings?.instagram} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Endereço</label>
                <input name="address" defaultValue={settings?.address} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Google Maps URL</label>
                <input name="googleMapsUrl" defaultValue={settings?.googleMapsUrl} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>
            <div className="md:col-span-2 pt-6">
              <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all flex items-center justify-center space-x-3">
                <Save size={24} />
                <span>Guardar Contactos</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-zinc-900">Categorias</h3>
              <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center space-x-2">
                <Plus size={20} />
                <span>Nova Categoria</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="p-6 bg-zinc-50 rounded-2xl border border-black/5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-zinc-900">{cat.name}</p>
                    <p className="text-xs text-zinc-400">Ordem: {cat.order}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => { setEditingItem(cat); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete('categories', cat.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-zinc-900">Itens do Menu</h3>
              <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center space-x-2">
                <Plus size={20} />
                <span>Novo Prato</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-zinc-50 rounded-2xl overflow-hidden border border-black/5 flex flex-col">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-32 w-full object-cover" />
                  ) : (
                    <div className="h-32 w-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <Utensils size={24} />
                    </div>
                  )}
                  <div className="p-4 flex-grow">
                    <h4 className="font-bold text-zinc-900">{item.name}</h4>
                    <p className="text-xs text-zinc-400">Kz{item.price.toFixed(2)}</p>
                    {/* Feature 4: availability badge */}
                    <span className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${item.isAvailable !== false ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {item.isAvailable !== false ? 'Em Stock' : 'Esgotado'}
                    </span>
                  </div>
                  <div className="p-4 border-t border-black/5 flex justify-end space-x-2">
                    {/* Feature 4: quick availability toggle (in stock / out of stock) */}
                    <button
                      onClick={() => handleToggleDishAvailability(item)}
                      title={item.isAvailable !== false ? 'Marcar como Esgotado' : 'Marcar como Disponível'}
                      className={`p-2 transition-colors ${item.isAvailable !== false ? 'text-green-500 hover:text-zinc-400' : 'text-red-400 hover:text-green-500'}`}
                    >
                      {item.isAvailable !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete('menuItems', item.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-zinc-900">Banners</h3>
                <p className="text-sm text-zinc-500">Imagens e vídeos do carousel principal e da grelha "Novidades & Promoções".</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Estes banners passam a rodar no carousel assim que existirem. Para <strong>trocar</strong> uma foto, edita o
                  banner e faz upload da nova imagem; para <strong>remover</strong>, apaga o banner (ou desliga o botão ativo /
                  a data "Ativo Até"). Enquanto esta lista estiver vazia, a galeria de fotos incluída no site é que aparece.
                </p>
              </div>
              <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center space-x-2">
                <Plus size={20} />
                <span>Novo Banner</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((banner) => (
                <div key={banner.id} className={`bg-zinc-50 rounded-2xl overflow-hidden border border-black/5 flex flex-col ${banner.active === false ? 'opacity-60' : ''}`}>
                  {banner.mediaType === 'video' ? (
                    <video src={banner.mediaUrl} muted playsInline preload="metadata" className="h-40 w-full object-cover bg-black" />
                  ) : (
                    <img src={banner.mediaUrl} alt="" loading="lazy" className="h-40 w-full object-cover" />
                  )}
                  <div className="p-4 flex-grow space-y-2">
                    <h4 className="font-bold text-zinc-900">{banner.title}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-[10px] font-black uppercase rounded-full">
                        {banner.placement === 'both' ? 'Hero + Grelha' : banner.placement === 'hero' ? 'Hero' : 'Grelha'}
                      </span>
                      {banner.badge && (
                        <span className="px-2 py-0.5 bg-secondary/20 text-yellow-700 text-[10px] font-black uppercase rounded-full">{banner.badge}</span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${banner.active === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {banner.active === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                    {(banner.activeFrom || banner.activeTo) && (
                      <p className="text-[11px] text-zinc-400">Agenda: {banner.activeFrom || '...'} → {banner.activeTo || '...'}</p>
                    )}
                  </div>
                  <div className="p-4 border-t border-black/5 flex justify-end space-x-2">
                    <button
                      onClick={() => handleToggleBannerActive(banner)}
                      title={banner.active === false ? 'Ativar' : 'Desativar'}
                      className={`p-2 transition-colors ${banner.active === false ? 'text-zinc-400 hover:text-green-500' : 'text-green-500 hover:text-zinc-400'}`}
                    >
                      <Power size={18} />
                    </button>
                    <button onClick={() => { setEditingItem(banner); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete('banners', banner.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <div className="col-span-full text-center py-12 text-zinc-400">
                  Nenhum banner. Clique em "Novo Banner" para adicionar o primeiro.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'teasers' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h3 className="text-2xl font-black text-zinc-900">Prévias da Contagem</h3>
                <p className="text-sm text-zinc-500">
                  Imagens e descrições dos cartões "Em Breve" que aparecem no fim da contagem regressiva.
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Edita aqui a foto e a descrição de cada bloco. Se esta lista ficar vazia, o site volta a mostrar
                  automaticamente os pratos marcados como "Novidade" no menu.
                </p>
              </div>
              <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center space-x-2 shrink-0">
                <Plus size={20} />
                <span>Nova Prévia</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teasers.map((teaser) => (
                <div key={teaser.id} className={`bg-zinc-50 rounded-2xl overflow-hidden border border-black/5 flex flex-col ${teaser.enabled === false ? 'opacity-60' : ''}`}>
                  {teaser.image ? (
                    <img src={teaser.image} alt="" loading="lazy" className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 w-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <Sparkles size={32} />
                    </div>
                  )}
                  <div className="p-4 flex-grow space-y-2">
                    <h4 className="font-bold text-zinc-900">{teaser.name}</h4>
                    <p className="text-sm text-zinc-500 line-clamp-2">{teaser.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-[10px] font-black uppercase rounded-full">
                        Ordem {teaser.order}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${teaser.enabled === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {teaser.enabled === false ? 'Inativa' : 'Ativa'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border-t border-black/5 flex justify-end space-x-2">
                    <button
                      onClick={() => handleToggleTeaser(teaser)}
                      title={teaser.enabled === false ? 'Ativar' : 'Desativar'}
                      className={`p-2 transition-colors ${teaser.enabled === false ? 'text-zinc-400 hover:text-green-500' : 'text-green-500 hover:text-zinc-400'}`}
                    >
                      <Power size={18} />
                    </button>
                    <button onClick={() => { setEditingItem(teaser); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete('teasers', teaser.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {teasers.length === 0 && (
                <div className="col-span-full text-center py-12 text-zinc-400">
                  Sem prévias criadas. Ascards dos pratos "Novidade" continuam a aparecer.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-black text-zinc-900">Zonas de Entrega — Huambo</h3>
                <p className="text-sm text-zinc-500">Taxas, tempos estimados e bairros cobertos em cada zona.</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleRestoreDefaultZones}
                  className="px-5 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold flex items-center space-x-2 hover:bg-zinc-200 transition-all"
                >
                  <RotateCcw size={18} />
                  <span>Restaurar Padrão</span>
                </button>
                <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center space-x-2">
                  <Plus size={20} />
                  <span>Nova Zona</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map((zone) => (
                <div key={zone.id} className={`p-6 bg-zinc-50 rounded-2xl border border-black/5 space-y-3 ${zone.enabled === false ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-900">{zone.name}</h4>
                      <p className="text-xs text-zinc-400">Taxa Kz{zone.fee} • {formatEta(zone)}</p>
                    </div>
                    <button
                      onClick={() => handleToggleZoneEnabled(zone)}
                      title={zone.enabled === false ? 'Ativar zona' : 'Desativar zona'}
                      className={`p-2 rounded-xl transition-colors ${zone.enabled === false ? 'text-zinc-300 hover:text-green-500' : 'text-green-500 hover:text-zinc-400'}`}
                    >
                      <Power size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(zone.neighborhoods || []).map(n => (
                      <span key={n} className="px-2.5 py-1 bg-white border border-black/5 rounded-full text-xs font-medium text-zinc-600">{n}</span>
                    ))}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => { setEditingItem(zone); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete('deliveryZones', zone.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-black text-zinc-900">Notas de Pratos</h3>
              <p className="text-sm text-zinc-500">Avaliações enviadas pelos clientes para cada prato. Oculte ou elimine avaliações impróprias.</p>
            </div>
            <div className="space-y-4">
              {dishRatings.map((rating) => {
                const dish = menuItems.find(i => i.id === rating.dishId);
                return (
                  <div key={rating.id} className={`p-6 bg-zinc-50 rounded-2xl border border-black/5 flex justify-between items-start gap-4 ${rating.isHidden ? 'opacity-50' : ''}`}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-900">{dish?.name || 'Prato eliminado'}</span>
                        {rating.isHidden && (
                          <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-[10px] font-black uppercase rounded-full">Oculta</span>
                        )}
                      </div>
                      <div className="flex text-secondary">
                        {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < (rating.rating || 0) ? 'currentColor' : 'none'} className={i < (rating.rating || 0) ? 'text-secondary' : 'text-zinc-300'} />)}
                      </div>
                      <p className="text-sm text-zinc-600 italic">"{rating.comment || '— Sem comentário —'}"</p>
                      <p className="text-[10px] text-zinc-400">{rating.userName} • {rating.date ? new Date(rating.date).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleDishRatingHidden(rating)}
                        title={rating.isHidden ? 'Mostrar avaliação' : 'Ocultar avaliação'}
                        className="p-2 text-zinc-400 hover:text-primary transition-colors"
                      >
                        {rating.isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button onClick={() => handleDelete('dishRatings', rating.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {dishRatings.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                  Nenhuma avaliação de pratos ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-zinc-900">Galeria de Imagens</h3>
              <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center space-x-2">
                <Plus size={20} />
                <span>Nova Imagem</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gallery.map((img) => (
                <div key={img.id} className="bg-zinc-50 rounded-2xl overflow-hidden border border-black/5 flex flex-col">
                  {img.url ? (
                    <img src={img.url} alt="" className="h-48 w-full object-cover" />
                  ) : (
                    <div className="h-48 w-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <div className="p-4 flex-grow">
                    <h4 className="font-bold text-zinc-900">{img.title}</h4>
                    <p className="text-xs text-zinc-400">{img.category}</p>
                  </div>
                  <div className="p-4 border-t border-black/5 flex justify-end space-x-2">
                    <button onClick={() => { setEditingItem(img); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete('gallery', img.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-12">
            <form onSubmit={handleSaveAbout} className="space-y-8">
              <h3 className="text-2xl font-black text-zinc-900">Conteúdo "Sobre Nós"</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Hero Image URL</label>
                    <input name="heroImage" value={tempImage} onChange={(e) => setTempImage(e.target.value)} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <ImageUpload label="Upload Hero Image" currentImage={tempImage} onUpload={setTempImage} />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Story Image URL</label>
                    <input name="storyImage" value={tempImage2} onChange={(e) => setTempImage2(e.target.value)} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <ImageUpload label="Upload Story Image" currentImage={tempImage2} onUpload={setTempImage2} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Título da História</label>
                  <input name="storyTitle" defaultValue={about?.storyTitle} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Subtítulo</label>
                  <input name="storySubtitle" defaultValue={about?.storySubtitle} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Texto 1</label>
                  <textarea name="storyText1" defaultValue={about?.storyText1} rows={3} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Texto 2</label>
                  <textarea name="storyText2" defaultValue={about?.storyText2} rows={3} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Citação</label>
                  <input name="quote" defaultValue={about?.quote} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Autor da Citação</label>
                  <input name="quoteAuthor" defaultValue={about?.quoteAuthor} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar Conteúdo Sobre Nós</button>
            </form>

            <div className="space-y-8 pt-12 border-t border-black/5">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-zinc-900">Nossa Equipa</h3>
                <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center space-x-2">
                  <Plus size={20} />
                  <span>Novo Membro</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {team.map((member) => (
                  <div key={member.id} className="bg-zinc-50 rounded-2xl overflow-hidden border border-black/5 flex flex-col">
                    {member.image ? (
                      <img src={member.image} alt="" className="aspect-[3/4] w-full object-cover" />
                    ) : (
                      <div className="aspect-[3/4] w-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <Users size={32} />
                      </div>
                    )}
                    <div className="p-4 flex-grow">
                      <h4 className="font-bold text-zinc-900">{member.name}</h4>
                      <p className="text-xs text-primary font-bold uppercase tracking-widest">{member.role}</p>
                    </div>
                    <div className="p-4 border-t border-black/5 flex justify-end space-x-2">
                      <button onClick={() => { setEditingItem(member); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete('team', member.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-zinc-900">Avaliações</h3>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-6 bg-zinc-50 rounded-2xl border border-black/5 flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex text-secondary">
                      {[...Array(review.rating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-zinc-900">{review.userName}</p>
                      {review.isApproved ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-black uppercase rounded-full">Aprovada</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-black uppercase rounded-full">Pendente</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 italic">"{review.comment}"</p>
                    <p className="text-[10px] text-zinc-400">{new Date(review.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex space-x-2">
                    {!review.isApproved && (
                      <button 
                        onClick={async () => {
                          try {
                            await apiPatch(`/reviews/${review.id}`, { isApproved: true });
                            setStatus({ type: 'success', message: 'Avaliação aprovada!' });
                          } catch (err) {
                            logError(err, `reviews/${review.id}`);
                          }
                        }}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-all"
                        title="Aprovar"
                      >
                        <Check size={20} />
                      </button>
                    )}
                    <button onClick={() => handleDelete('reviews', review.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                  Nenhuma avaliação encontrada.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-zinc-900">Utilizadores da Plataforma</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-black/5 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${u.isAnonymous ? 'bg-zinc-200 text-zinc-500' : 'bg-primary/10 text-primary'}`}>
                      {u.isAnonymous ? '?' : (u.email?.[0].toUpperCase() || 'U')}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">
                        {u.isAnonymous ? 'Visitante Anónimo' : (u.email || 'Utilizador sem email')}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className={`text-xs font-bold uppercase tracking-widest ${u.role === 'admin' ? 'text-primary' : 'text-zinc-400'}`}>
                          {u.role}
                        </p>
                        <span className="text-zinc-300">•</span>
                        <p className="text-xs text-zinc-400">
                          ID: {u.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {!u.isAnonymous && (
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        className="px-4 py-2 bg-white border border-black/5 rounded-xl text-sm font-bold focus:outline-none focus:border-primary"
                      >
                        <option value="visitor">Visitante</option>
                        <option value="user">Utilizador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                    {u.isAnonymous && (
                      <span className="px-4 py-2 bg-zinc-100 text-zinc-500 rounded-xl text-xs font-bold uppercase">
                        Apenas Leitura
                      </span>
                    )}
                    {u.email !== "miguellanttonio007@gmail.com" && (
                      <button
                        onClick={() => handleDelete('users', u.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-2xl rounded-[40px] p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-zinc-900">
                  {editingItem?.id ? 'Editar' : 'Novo'} {
                    activeTab === 'categories' ? 'Categoria' : 
                    activeTab === 'gallery' ? 'Imagem' :
                    activeTab === 'about' ? 'Membro da Equipa' :
                    activeTab === 'banners' ? 'Banner' :
                    activeTab === 'teasers' ? 'Prévia' :
                    activeTab === 'zones' ? 'Zona de Entrega' :
                    'Prato'
                  }
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><X size={24} /></button>
              </div>

              {activeTab === 'categories' ? (
                <form onSubmit={handleSaveCategory} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome</label>
                    <input name="name" defaultValue={editingItem?.name} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ordem</label>
                    <input name="order" type="number" defaultValue={editingItem?.order} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar</button>
                </form>
              ) : activeTab === 'gallery' ? (
                <form onSubmit={handleSaveGallery} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Título</label>
                      <input name="title" defaultValue={editingItem?.title} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Categoria</label>
                      <input name="category" defaultValue={editingItem?.category} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ordem</label>
                    <input name="order" type="number" defaultValue={editingItem?.order} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Imagem URL</label>
                      <input name="url" value={tempImage} onChange={(e) => setTempImage(e.target.value)} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <ImageUpload label="Upload Imagem" currentImage={tempImage} onUpload={setTempImage} />
                  </div>
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar</button>
                </form>
              ) : activeTab === 'banners' ? (
                <form onSubmit={handleSaveBanner} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Título</label>
                      <input name="title" defaultValue={editingItem?.title} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Subtítulo</label>
                      <input name="subtitle" defaultValue={editingItem?.subtitle} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tipo de Mídia</label>
                      <select name="mediaType" defaultValue={editingItem?.mediaType || 'image'} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all">
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Onde Mostrar</label>
                      <select name="placement" defaultValue={editingItem?.placement || 'both'} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all">
                        <option value="hero">Carousel Principal</option>
                        <option value="grid">Grelha Novidades</option>
                        <option value="both">Ambos</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Badge</label>
                      <select name="badge" defaultValue={editingItem?.badge || ''} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all">
                        <option value="">Sem badge</option>
                        <option value="Promoção">Promoção</option>
                        <option value="Novidade">Novidade</option>
                        <option value="Evento">Evento</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Mídia (URL de imagem, MP4 ou YouTube)</label>
                      <input
                        value={tempImage}
                        onChange={(e) => setTempImage(e.target.value)}
                        placeholder="https://..."
                        required
                        className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <ImageUpload label="Ou faça upload de uma imagem" currentImage={tempImage} onUpload={setTempImage} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Texto do Botão (CTA)</label>
                      <input name="ctaLabel" defaultValue={editingItem?.ctaLabel} placeholder="Pedir Agora" className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Link do Botão</label>
                      <input name="ctaLink" defaultValue={editingItem?.ctaLink} placeholder="/menu" className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ordem</label>
                      <input name="order" type="number" defaultValue={editingItem?.order} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ativo Desde</label>
                      <input name="activeFrom" type="date" defaultValue={editingItem?.activeFrom} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ativo Até</label>
                      <input name="activeTo" type="date" defaultValue={editingItem?.activeTo} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" name="active" defaultChecked={editingItem?.id ? editingItem?.active !== false : true} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-zinc-900">Banner ativo</span>
                  </label>
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar</button>
                </form>
              ) : activeTab === 'teasers' ? (
                <form onSubmit={handleSaveTeaser} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome do prato / anúncio</label>
                    <input name="name" defaultValue={editingItem?.name} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Descrição (aparece por baixo do nome)</label>
                    <textarea name="description" defaultValue={editingItem?.description} rows={2} placeholder="Pão, carne, queijo e molho da casa" className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Imagem</label>
                      <input name="image" value={tempImage} onChange={(e) => setTempImage(e.target.value)} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <ImageUpload label="Ou faça upload da imagem" currentImage={tempImage} onUpload={setTempImage} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ordem</label>
                    <input name="order" type="number" defaultValue={editingItem?.order ?? teasers.length + 1} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" name="enabled" defaultChecked={editingItem?.id ? editingItem?.enabled !== false : true} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-zinc-900">Mostrar esta prévia na contagem</span>
                  </label>
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar</button>
                </form>
              ) : activeTab === 'zones' ? (
                <form onSubmit={handleSaveZone} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome da Zona</label>
                      <input name="name" defaultValue={editingItem?.name} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ordem</label>
                      <input name="order" type="number" defaultValue={editingItem?.order} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Taxa de Entrega (Kz)</label>
                      <input name="fee" type="number" min="0" defaultValue={editingItem?.fee} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tempo Mín (min)</label>
                        <input name="timeMin" type="number" min="0" defaultValue={editingItem?.timeMin} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tempo Máx (min)</label>
                        <input name="timeMax" type="number" min="0" defaultValue={editingItem?.timeMax} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Bairros (separados por vírgula)</label>
                    <textarea
                      name="neighborhoods"
                      defaultValue={(editingItem?.neighborhoods || []).join(', ')}
                      rows={2}
                      placeholder="Cidade Alta, Mercado Central, Vila Teixeira"
                      className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none"
                    />
                  </div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" name="enabled" defaultChecked={editingItem?.id ? editingItem?.enabled !== false : true} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-zinc-900">Zona ativa (visível aos clientes)</span>
                  </label>
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar</button>
                </form>
              ) : activeTab === 'about' ? (
                <form onSubmit={handleSaveTeam} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome</label>
                      <input name="name" defaultValue={editingItem?.name} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Cargo</label>
                      <input name="role" defaultValue={editingItem?.role} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ordem</label>
                    <input name="order" type="number" defaultValue={editingItem?.order} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Imagem URL</label>
                      <input name="image" value={tempImage} onChange={(e) => setTempImage(e.target.value)} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <ImageUpload label="Upload Foto" currentImage={tempImage} onUpload={setTempImage} />
                  </div>
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar</button>
                </form>
              ) : (
                <form onSubmit={handleSaveMenuItem} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome</label>
                      <input name="name" defaultValue={editingItem?.name} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Preço (Kz)</label>
                      <input name="price" type="number" step="0.01" defaultValue={editingItem?.price} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Categoria</label>
                    <select name="categoryId" defaultValue={editingItem?.categoryId} required className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Descrição</label>
                    <textarea name="description" defaultValue={editingItem?.description} rows={3} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Imagem URL</label>
                      <input 
                        name="image" 
                        value={tempImage} 
                        onChange={(e) => setTempImage(e.target.value)}
                        required 
                        className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" 
                      />
                    </div>
                    <ImageUpload 
                      label="Ou faça upload de uma imagem" 
                      currentImage={tempImage} 
                      onUpload={setTempImage} 
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" name="isPopular" defaultChecked={editingItem?.isPopular} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-zinc-900">Mais Pedido</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" name="isPromo" defaultChecked={editingItem?.isPromo} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-zinc-900">Promoção</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" name="isNew" defaultChecked={editingItem?.isNew} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-zinc-900">Novidade</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" name="isAvailable" defaultChecked={editingItem?.id ? editingItem?.isAvailable !== false : true} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-zinc-900">Em Stock (desmarque = Esgotado)</span>
                    </label>
                  </div>

                  {/* Feature 4: dish details fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tempo de Preparação (minutos)</label>
                      <input name="prepTimeMinutes" type="number" min="0" defaultValue={editingItem?.prepTimeMinutes} className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Informação Nutricional</label>
                      <input name="nutritionInfo" defaultValue={editingItem?.nutritionInfo} placeholder="Ex: 550 kcal" className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ingredientes (separados por vírgula)</label>
                      <input name="ingredients" defaultValue={editingItem?.ingredients} placeholder="Pão, Carne, Queijo, Alface" className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Alérgenos</label>
                      <input name="allergens" defaultValue={editingItem?.allergens} placeholder="Ex: Contém glúten, ovo e laticínios" className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>

                  {/* Feature 4: sizes/portions editor */}
                  <div className="space-y-4 pt-4 border-t border-black/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tamanhos / Porções (Opcional)</label>
                      <button
                        type="button"
                        onClick={() => setSizes([...sizes, { name: '', price: 0 }])}
                        className="text-xs font-bold text-primary flex items-center space-x-1 hover:underline"
                      >
                        <Plus size={14} />
                        <span>Adicionar Tamanho</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {sizes.map((size, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <input
                            placeholder="Nome (ex: Grande)"
                            value={size.name}
                            onChange={(e) => {
                              const newSizes = [...sizes];
                              newSizes[index].name = e.target.value;
                              setSizes(newSizes);
                            }}
                            className="flex-grow px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                          />
                          <input
                            type="number"
                            placeholder="Preço total"
                            value={size.price}
                            onChange={(e) => {
                              const newSizes = [...sizes];
                              newSizes[index].price = Number(e.target.value);
                              setSizes(newSizes);
                            }}
                            className="w-32 px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setSizes(sizes.filter((_, i) => i !== index))}
                            className="p-3 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      {sizes.length === 0 && (
                        <p className="text-xs text-zinc-400 italic">Nenhum tamanho adicionado. O preço base é usado por omissão.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-black/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Extras (Opcional)</label>
                      <button 
                        type="button"
                        onClick={() => setExtras([...extras, { name: '', price: 0 }])}
                        className="text-xs font-bold text-primary flex items-center space-x-1 hover:underline"
                      >
                        <Plus size={14} />
                        <span>Adicionar Extra</span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {extras.map((extra, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <input 
                            placeholder="Nome (ex: Queijo)"
                            value={extra.name}
                            onChange={(e) => {
                              const newExtras = [...extras];
                              newExtras[index].name = e.target.value;
                              setExtras(newExtras);
                            }}
                            className="flex-grow px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                          />
                          <input 
                            type="number"
                            placeholder="Preço"
                            value={extra.price}
                            onChange={(e) => {
                              const newExtras = [...extras];
                              newExtras[index].price = Number(e.target.value);
                              setExtras(newExtras);
                            }}
                            className="w-24 px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                          />
                          <button 
                            type="button"
                            onClick={() => setExtras(extras.filter((_, i) => i !== index))}
                            className="p-3 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      {extras.length === 0 && (
                        <p className="text-xs text-zinc-400 italic">Nenhum extra adicionado.</p>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all">Guardar</button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
