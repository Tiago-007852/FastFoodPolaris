import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Phone, MapPin, Clock, Facebook, Twitter } from 'lucide-react';
import { useSite } from '../SiteContext';

export const Footer: React.FC = () => {
  const { settings } = useSite();

  return (
    <footer className="bg-zinc-900 text-zinc-400 py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="text-2xl font-bold tracking-tighter text-white">
              {settings?.restaurantName || 'Polaris Fast-Food'}
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              {settings?.slogan || 'O sabor que você merece, com a rapidez que você precisa.'}
            </p>
            <div className="flex items-center space-x-4">
              {settings?.instagram && (
                <a 
                  href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-full bg-white/5 hover:bg-primary hover:text-white transition-all"
                >
                  <span className="sr-only">Instagram</span>
                  <Instagram size={18} />
                </a>
              )}
              {settings?.phone && (
                <a 
                  href={`https://wa.me/${settings.phone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-full bg-white/5 hover:bg-primary hover:text-white transition-all"
                >
                  <span className="sr-only">WhatsApp</span>
                  <Phone size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Links Rápidos</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/menu" className="hover:text-primary transition-colors">Menu Digital</Link></li>
              <li><Link to="/sobre" className="hover:text-primary transition-colors">Sobre Nós</Link></li>
              <li><Link to="/contacto" className="hover:text-primary transition-colors">Contacto</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Contacto</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-secondary shrink-0" />
                <span>{settings?.address || 'Rua Principal, 123, Cidade'}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-secondary shrink-0" />
                <span>{settings?.phone || '(11) 99999-9999'}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Clock size={18} className="text-secondary shrink-0" />
                <span>{settings?.openingHours || 'Seg - Dom: 11:00 - 23:00'}</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Novidades</h3>
            <p className="text-sm">Subscreva para receber promoções exclusivas.</p>
            <form className="flex space-x-2">
              <input
                type="email"
                placeholder="Seu email"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary w-full"
              />
              <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                OK
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center text-xs">
          <p>© {new Date().getFullYear()} {settings?.restaurantName || 'Polaris Fast-Food'}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
