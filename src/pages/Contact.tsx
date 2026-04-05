import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, MessageCircle, Instagram, Clock, Navigation, Mail } from 'lucide-react';
import { useSite } from '../SiteContext';

export const Contact: React.FC = () => {
  const { settings } = useSite();

  const contactCards = [
    {
      icon: <Phone size={24} />,
      title: 'Telefone',
      value: settings?.phone || '(11) 99999-9999',
      link: `tel:${settings?.phone?.replace(/\D/g, '')}`,
      color: 'bg-blue-500'
    },
    {
      icon: <MessageCircle size={24} />,
      title: 'WhatsApp',
      value: settings?.whatsapp || '(11) 99999-9999',
      link: `https://wa.me/${settings?.whatsapp?.replace(/\D/g, '')}`,
      color: 'bg-emerald-500'
    },
    {
      icon: <Instagram size={24} />,
      title: 'Instagram',
      value: settings?.instagram || '@fastfoodexpress',
      link: `https://instagram.com/${settings?.instagram?.replace('@', '')}`,
      color: 'bg-pink-500'
    },
    {
      icon: <Mail size={24} />,
      title: 'Email',
      value: settings?.email || 'contacto@polaris.com',
      link: `mailto:${settings?.email || 'contacto@polaris.com'}`,
      color: 'bg-zinc-800'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-5xl font-black tracking-tight text-zinc-900">Fale Connosco</h1>
        <p className="text-zinc-500 max-w-xl mx-auto">Estamos aqui para o ajudar. Entre em contacto por qualquer um dos canais abaixo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Contact Info */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {contactCards.map((card, idx) => (
              <motion.a
                key={card.title}
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center space-x-4 p-6 bg-white rounded-3xl border border-black/5 shadow-xl shadow-black/5 hover:border-primary/30 transition-all group"
              >
                <div className={`p-4 ${card.color} text-white rounded-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{card.title}</p>
                  <p className="font-bold text-zinc-900">{card.value}</p>
                </div>
              </motion.a>
            ))}
          </div>

          <div className="bg-zinc-900 p-8 rounded-[40px] text-white space-y-6">
            <div className="flex items-center space-x-3 text-secondary">
              <Clock size={24} />
              <h3 className="text-xl font-bold">Horário de Funcionamento</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-zinc-400">Segunda - Quinta</span>
                <span className="font-bold">11:00 - 23:00</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-zinc-400">Sexta - Sábado</span>
                <span className="font-bold">11:00 - 01:00</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-zinc-400">Domingo</span>
                <span className="font-bold">12:00 - 23:00</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 italic">
              * Os horários podem variar em feriados.
            </p>
          </div>
        </div>

        {/* Map & Location */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-2xl shadow-black/5 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-start space-x-4">
                <div className="p-4 bg-secondary/20 text-primary rounded-2xl">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-900">Nossa Localização</h3>
                  <p className="text-zinc-500">{settings?.address || 'Rua Principal, 123, Cidade, Portugal'}</p>
                </div>
              </div>
              <a
                href={settings?.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings?.address || 'Rua Principal, 123, Cidade')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-primary text-white rounded-full font-bold flex items-center space-x-2 hover:bg-primary-hover transition-all shadow-xl shadow-primary/20"
              >
                <Navigation size={20} />
                <span>Como Chegar</span>
              </a>
            </div>

            <div className="h-[450px] rounded-[32px] overflow-hidden border border-black/5 shadow-inner bg-zinc-100">
              <iframe
                src={settings?.googleMapsUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3113.112345678901!2d-9.123456789012345!3d38.123456789012345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzjCsDA3JzM0LjQiTiA5wrAwNyc0NC40Ilc!5e0!3m2!1spt-PT!2spt!4v1234567890123"}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

          {/* Social Proof */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-secondary/10 p-8 rounded-[40px] border border-secondary/20 flex items-center space-x-6">
              <div className="text-4xl font-black text-primary">100%</div>
              <div className="text-zinc-900 font-medium leading-tight">Sabor<br/>Autêntico</div>
            </div>
            <div className="bg-zinc-900 p-8 rounded-[40px] border border-white/5 flex items-center space-x-6">
              <div className="text-4xl font-black text-white">30m</div>
              <div className="text-zinc-400 font-medium leading-tight">Tempo Médio de<br/>Entrega</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
