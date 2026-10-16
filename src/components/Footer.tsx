import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Phone, MapPin, Clock, Facebook, Twitter, MessageCircle, ExternalLink, ArrowUpRight } from 'lucide-react';
import { useSite } from '../SiteContext';

const stripDigits = (value: string | undefined) => (value?.replace(/\D/g, '') || '').replace(/^0/, '244');

export const Footer: React.FC = () => {
  const { settings } = useSite();

  const MAIN_WHATSAPP_DEFAULT = '+244 922 923 776';
  const GENERAL_WHATSAPP_DEFAULT = '+244 928 936 650';

  const whatsappDigits = stripDigits(settings?.whatsapp) || stripDigits(MAIN_WHATSAPP_DEFAULT);
  const generalDigits = stripDigits(settings?.contactPhone) || stripDigits(GENERAL_WHATSAPP_DEFAULT);

  const mapsBase = 'https://www.google.com/maps/search/?api=1';
  const mapsQuery = settings?.address || 'Polaris Fast-Food, Huambo';
  const googleMapsHref =
    settings?.googleMapsUrl?.trim()
      ? settings.googleMapsUrl.trim()
      : `${mapsBase}/query/${encodeURIComponent(mapsQuery)}`;

  return (            <footer className="bg-zinc-950 text-zinc-400">
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
            <div className="flex items-center space-x-3">
              {settings?.instagram && (
                <a 
                  href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-white/10 group"
                >
                  <span className="sr-only">Instagram</span>
                  <Instagram size={18} className="group-hover:scale-110 transition-transform" />
                </a>
              )}
              <a 
                href={`https://wa.me/${whatsappDigits}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2.5 rounded-full bg-secondary/10 hover:bg-secondary hover:text-white transition-all border border-secondary/20 group"
              >
                <span className="sr-only">WhatsApp pedidos</span>
                <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
              </a>
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
              {settings?.address && (
                <li className="group">
                  <a
                    href={googleMapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 hover:bg-white/10 hover:border-primary/40 transition-all group"
                  >
                    <span className="shrink-0">
                      <MapPin size={20} className="text-secondary" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white leading-snug">{settings.address}</span>
                      <span className="block text-xs text-zinc-400 mt-1">Ver localização no mapa · como chegar</span>
                    </span>
                    <ExternalLink size={14} className="shrink-0 mt-1.5 text-zinc-500 group-hover:text-white transition-colors" />
                  </a>
                </li>              )}
              {whatsappDigits && (
                <li className="flex items-center space-x-3">
                  <MessageCircle size={18} className="text-secondary shrink-0" />
                  <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-white transition-colors">
                    {settings?.whatsapp} (WhatsApp pedidos)
                  </a>
                </li>
              )}              {generalDigits && (
                <li className="flex items-center space-x-3">
                  <MessageCircle size={18} className="text-secondary shrink-0" />
                  <a href={`https://wa.me/${generalDigits}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-white transition-colors">
                    {GENERAL_WHATSAPP_DEFAULT} ({settings?.contactPhoneLabel || 'WhatsApp geral'})
                  </a>
                </li>
              )}
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-secondary shrink-0" />
                <span>{settings?.phone || '(244) 940250279'}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Clock size={18} className="text-secondary shrink-0" />
                <span>{settings?.openingHours || 'Seg - Dom: 11:00 - 23:00'}</span>
              </li>
            </ul>
          </div>

          {/* Instruções de como chegar - só quando existe morada ou maps configurados */}
          {(!!settings?.address || !!settings?.googleMapsUrl) && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Como chegar</h4>
              {(settings?.googleMapsUrl && settings.googleMapsUrl.trim()) && (
                <a
                  href={settings.googleMapsUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Abrir no Google Maps
                  <ArrowUpRight size={14} />
                </a>
              )}
              <p className="text-sm text-zinc-400 mt-2">
                {settings?.address && (
                  <>
                    <span className="block text-zinc-300 font-semibold">Morada:</span>
                    <span className="text-zinc-400">{settings.address}</span>
                  </>
                )}
                <span className="block text-zinc-300 font-semibold mt-2">Onde estamos:</span>
                <span className="text-zinc-400">
                  {settings?.address
                    ? `Em ${settings.address}, Huambo, Angola.`
                    : 'Localização no Huambo, Angola (ver no mapa acima).'}
                </span>
              </p>
            </div>
          )}

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="w-6 h-px bg-zinc-800 shrink-0"/>
              Novidades
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">Subscreva para receber promoções exclusivas e novidades da Polaris.</p>
            <form className="flex space-x-2">
              <input
                type="email"
                placeholder="Seu email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary hover:border-white/20 transition-colors"
              />
              <button className="shrink-0 bg-white/10 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-white/20 border border-white/10 transition-colors">
                Subscrever
              </button>
            </form>
            <p className="text-xs text-zinc-600">Respeitamos a tua privacidade. Podes desinscrever-te quando quiseres.</p>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p className="text-zinc-500">© {new Date().getFullYear()} {settings?.restaurantName || 'Polaris Fast-Food'}. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-zinc-500">
            <Link to="/sobre" className="hover:text-white transition-colors">Sobre nós</Link>
            <Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link>
            <Link to="/menu" className="hover:text-white transition-colors">Menu</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
