import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, Trash2, Edit2, Save, X, LogIn, LayoutGrid, Utensils, Star, Image as ImageIcon, Check, AlertCircle, Upload, Users, Phone } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSite } from '../SiteContext';
import { loginWithGoogle, db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firestoreUtils';
import { Category, MenuItem, SiteSettings, Review, GalleryImage, TeamMember, AboutContent } from '../types';
import { seedDatabase } from '../seed';
import { ImageUpload } from '../components/ImageUpload';

export const Admin: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { categories, menuItems, settings, reviews, gallery, team, about, loading: siteLoading } = useSite();
  const [activeTab, setActiveTab] = useState<'settings' | 'categories' | 'menu' | 'reviews' | 'gallery' | 'about' | 'users' | 'contacts'>('settings');
  const [users, setUsers] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tempImage, setTempImage] = useState<string>('');
  const [tempImage2, setTempImage2] = useState<string>('');
  const [extras, setExtras] = useState<{ name: string; price: number }[]>([]);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      const fetchUsers = async () => {
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
      };
      fetchUsers();
    }
  }, [activeTab, isAdmin]);

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setStatus({ type: 'success', message: 'Permissão atualizada!' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      setStatus({ type: 'error', message: 'Erro ao atualizar permissão.' });
    }
  };

  const handleSeed = async () => {
    if (confirm('Deseja resetar o menu? Isso irá apagar os itens atuais e carregar a nova lista de produtos (Hambúrgueres, Bebidas, Sobremesas, etc).')) {
      setIsSeeding(true);
      await seedDatabase();
      setIsSeeding(false);
      setStatus({ type: 'success', message: 'Menu atualizado com sucesso!' });
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
      } else if (activeTab === 'about' && editingItem.name) { // Team member
        setTempImage(editingItem.image || '');
      } else {
        setTempImage(editingItem.image || '');
      }
      setExtras(editingItem.extras || []);
    } else if (!isModalOpen) {
      setTempImage('');
      setTempImage2('');
      setExtras([]);
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
            <button
              onClick={async () => {
                if (isLoggingIn) return;
                setIsLoggingIn(true);
                try {
                  await loginWithGoogle();
                } catch (err: any) {
                  if (err.code === 'auth/popup-blocked') {
                    setStatus({ type: 'error', message: 'O seu navegador bloqueou o pop-up de login. Por favor, permita pop-ups para este site.' });
                  } else if (err.code !== 'auth/cancelled-popup-request') {
                    setStatus({ type: 'error', message: 'Erro ao entrar com Google.' });
                  }
                } finally {
                  setIsLoggingIn(false);
                }
              }}
              disabled={isLoggingIn}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              <LogIn size={24} />
              <span>{isLoggingIn ? 'A entrar...' : 'Entrar como Admin'}</span>
            </button>
            <p className="text-xs text-zinc-400">
              Nota: Se a janela de login não abrir, verifique se o seu navegador está a bloquear pop-ups.
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
      const settingsRef = doc(db, 'siteSettings', 'main');
      const updateData: any = { ...data };
      if (updateData.deliveryFee) updateData.deliveryFee = Number(updateData.deliveryFee);
      if (tempImage && activeTab === 'settings') updateData.heroImage = tempImage;

      await updateDoc(settingsRef, updateData);
      setStatus({ type: 'success', message: 'Definições guardadas com sucesso!' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'siteSettings/main');
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
        await updateDoc(doc(db, 'categories', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'categories'), data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Categoria guardada!' });
    } catch (err) {
      handleFirestoreError(err, editingItem?.id ? OperationType.UPDATE : OperationType.CREATE, 'categories');
      setStatus({ type: 'error', message: 'Erro ao guardar categoria.' });
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const validExtras = extras.filter(e => e.name.trim() !== '');

    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      image: tempImage,
      categoryId: formData.get('categoryId') as string,
      isPopular: formData.get('isPopular') === 'on',
      isPromo: formData.get('isPromo') === 'on',
      extras: validExtras
    };

    try {
      if (editingItem?.id) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'menuItems'), data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Prato guardado!' });
    } catch (err) {
      handleFirestoreError(err, editingItem?.id ? OperationType.UPDATE : OperationType.CREATE, 'menuItems');
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
      await setDoc(doc(db, 'siteSettings', 'about'), data);
      setStatus({ type: 'success', message: 'Conteúdo "Sobre Nós" guardado!' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'siteSettings/about');
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
        await updateDoc(doc(db, 'gallery', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'gallery'), data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Imagem da galeria guardada!' });
    } catch (err) {
      handleFirestoreError(err, editingItem?.id ? OperationType.UPDATE : OperationType.CREATE, 'gallery');
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
        await updateDoc(doc(db, 'team', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'team'), data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setStatus({ type: 'success', message: 'Membro da equipa guardado!' });
    } catch (err) {
      handleFirestoreError(err, editingItem?.id ? OperationType.UPDATE : OperationType.CREATE, 'team');
      setStatus({ type: 'error', message: 'Erro ao guardar membro.' });
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este item?')) {
      try {
        await deleteDoc(doc(db, coll, id));
        setStatus({ type: 'success', message: 'Item eliminado!' });
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${coll}/${id}`);
        setStatus({ type: 'error', message: 'Erro ao eliminar item.' });
      }
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
          { id: 'gallery', label: 'Galeria', icon: <ImageIcon size={18} /> },
          { id: 'about', label: 'Sobre Nós', icon: <Users size={18} /> },
          { id: 'reviews', label: 'Avaliações', icon: <Star size={18} /> },
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
                  </div>
                  <div className="p-4 border-t border-black/5 flex justify-end space-x-2">
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
                            await updateDoc(doc(db, 'reviews', review.id), { isApproved: true });
                            setStatus({ type: 'success', message: 'Avaliação aprovada!' });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, `reviews/${review.id}`);
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
                  <div className="flex space-x-8">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" name="isPopular" defaultChecked={editingItem?.isPopular} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-zinc-900">Popular</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" name="isPromo" defaultChecked={editingItem?.isPromo} className="w-5 h-5 rounded border-black/5 text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-zinc-900">Promoção</span>
                    </label>
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
