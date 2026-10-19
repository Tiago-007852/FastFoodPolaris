import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Phone, MapPin, Clock, MessageCircle, ExternalLink } from 'lucide-react';
import { useSite } from '../SiteContext';

const stripDigits = (value: string | undefined) => (value?.replace(/\D/g, '') || '').replace(/^0/, '244');

const MAIN_WHATSAPP_DEFAULT = '+244 922 923 776';
const GENERAL_WHATSAPP_DEFAULT = '+244 928 936 650';

export const Footer: React.FC = () => {
  const { settings } = useSite();

  const whatsappDigits = stripDigits(settings?.whatsapp) || stripDigits(MAIN_WHATSAPP_DEFAULT);
  const generalDigits = stripDigits(settings?.contactPhone) || stripDigits(GENERAL_WHATSAPP_DEFAULT);

  const mapsBase = 'https://www.google.com/maps/search/?api=1';
  const mapsQuery = settings?.address || 'Polaris Fast-Food, Huambo';
  const googleMapsHref = settings?.googleMapsUrl?.trim()
    ? settings.googleMapsUrl.trim()
    : `${mapsBase}/query/${encodeURIComponent(mapsQuery)}`;

  return (
    <footer className="bg-zinc-950 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Marca */}
          <div className="space-y-5">
            <Link to="/" className="inline-block text-2xl font-bold tracking-tighter text-white">
              {settings?.restaurantName || 'Polaris Fast-Food'}
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-zinc-400">
              {settings?.slogan || 'O sabor que você merece, com a rapidez que você precisa.'}
            </p>
            <p className="text-xs text-zinc-500 max-w-xs">
              Entregas em todo o Huambo e levantamento na loja {settings?.pickupLocation ? `(${settings.pickupLocation})` : '(perto da estação PCH)'}.
            </p>
            <div className="flex items-center space-x-3">
              {settings?.instagram && (
                <a
                  href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-white/10"
                >
                  <Instagram size={18} />
                </a>
              )}
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp pedidos"
                className="p-2.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-400/20"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Links rápidos */}
          <div className="space-y-5">
            <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Navegação</h3>
            <ul className="space-y-3.5 text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/menu" className="hover:text-primary transition-colors">Menu</Link></li>
              <li><Link to="/sobre" className="hover:text-primary transition-colors">Sobre Nós</Link></li>
              <li><Link to="/galeria" className="hover:text-primary transition-colors">Galeria</Link></li>
              <li><Link to="/contacto" className="hover:text-primary transition-colors">Contacto</Link></li>
              <li><Link to="/carrinho" className="hover:text-primary transition-colors">Carrinho</Link></li>
            </ul>
          </div>

          {/* Contactos */}
          <div className="space-y-5">
            <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Contactos</h3>
            <ul className="space-y-3.5 text-sm">
              <li>
                <a
                  href={googleMapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 hover:text-white transition-colors group"
                >
                  <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    <span className="block">{settings?.address || 'Huambo, Angola'}</span>
                    <span className="text-xs text-zinc-500 inline-flex items-center gap-1 group-hover:text-zinc-400 transition-colors">
                      Ver no Google Maps <ExternalLink size={10} />
                    </span>
                  </span>
                </a>
              </li>
              {whatsappDigits && (
                <li className="flex items-center gap-2.5">
                  <MessageCircle size={16} className="text-primary shrink-0" />
                  <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    {settings?.whatsapp || MAIN_WHATSAPP_DEFAULT}
                    <span className="text-zinc-500"> (pedidos)</span>
                  </a>
                </li>
              )}
              {generalDigits && generalDigits !== whatsappDigits && (
                <li className="flex items-center gap-2.5">
                  <MessageCircle size={16} className="text-primary shrink-0" />
                  <a href={`https://wa.me/${generalDigits}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    {settings?.contactPhone || GENERAL_WHATSAPP_DEFAULT}
                    <span className="text-zinc-500"> ({settings?.contactPhoneLabel || 'geral'})</span>
                  </a>
                </li>
              )}
              {settings?.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone size={16} className="text-primary shrink-0" />
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="hover:text-white transition-colors">{settings.phone}</a>
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <Clock size={16} className="text-primary shrink-0" />
                <span>{settings?.openingHours || 'Seg – Dom: 11:00 – 23:00'}</span>
              </li>
            </ul>
          </div>

          {/* Informação + documentos legais */}
          <div className="space-y-5">
            <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Informação</h3>
            <ul className="space-y-3.5 text-sm">
              <li><Link to="/politica-privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-primary transition-colors">Termos e Condições</Link></li>
              <li><Link to="/politica-encomendas" className="hover:text-primary transition-colors">Encomendas, Pagamentos e Entregas</Link></li>
              <li><Link to="/perfil" className="hover:text-primary transition-colors">A minha conta</Link></li>
            </ul>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Dúvidas sobre privacidade ou dados? Fale connosco pelos canais acima.
            </p>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p className="text-zinc-500">© {new Date().getFullYear()} {settings?.restaurantName || 'Polaris Fast-Food'}. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-zinc-500">
            <Link to="/politica-privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link to="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
