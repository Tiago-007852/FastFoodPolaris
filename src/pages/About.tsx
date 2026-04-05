import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Users, Award, Heart } from 'lucide-react';
import { useSite } from '../SiteContext';

export const About: React.FC = () => {
  const { settings, team, about } = useSite();

  const stats = [
    { icon: <Utensils size={24} />, label: 'Ingredientes Frescos', value: '100%' },
    { icon: <Users size={24} />, label: 'Receitas Originais', value: 'Exclusivas' },
    { icon: <Award size={24} />, label: 'Entrega Rápida', value: '< 30 min' },
    { icon: <Heart size={24} />, label: 'Avaliação Média', value: '4.9/5' },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative h-[50vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={about?.heroImage || "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop"}
            alt="About Us"
            className="w-full h-full object-cover brightness-[0.5]"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black text-white tracking-tighter"
          >
            {about?.storyTitle || 'Nossa História'}
          </motion.h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Quem Somos</h2>
                <h3 className="text-4xl font-black tracking-tight text-zinc-900">{about?.storySubtitle || 'Paixão por comida rápida e de qualidade.'}</h3>
              </div>
              <p className="text-zinc-600 leading-relaxed text-lg">
                {about?.storyText1 || `Polaris nasceu da ideia de algo simples, mas poderoso: ser o ponto de referência no meio de tantas escolhas.`}
              </p>
              <p className="text-zinc-600 leading-relaxed">
                {about?.storyText2 || 'Nossa equipa é composta por apaixonados pela gastronomia que trabalham incansavelmente para criar sabores únicos que alegram o dia dos nossos clientes. Cada hambúrguer, cada batata e cada sobremesa é preparada com o máximo cuidado, garantindo uma experiência inesquecível em cada dentada.'}
              </p>
              <div className="grid grid-cols-2 gap-8 pt-8">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="text-primary">{stat.icon}</div>
                    <p className="text-2xl font-black text-zinc-900">{stat.value}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-[60px] overflow-hidden shadow-2xl shadow-black/10">
                <img
                  src={about?.storyImage || "https://images.unsplash.com/photo-1577214495773-51465d5061df?q=80&w=1974&auto=format&fit=crop"}
                  alt="Cozinha"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-primary p-8 rounded-[40px] text-white shadow-2xl shadow-primary/20 max-w-xs hidden md:block">
                <p className="text-2xl font-black mb-2">{about?.quote || '"Qualidade em primeiro lugar."'}</p>
                <p className="text-secondary text-sm font-medium">- {about?.quoteAuthor || 'Chef Executivo'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Nossa Equipa</h2>
            <h3 className="text-4xl font-black tracking-tight text-zinc-900">As Mãos Por Trás do Sabor</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-4 group"
              >
                <div className="aspect-[3/4] rounded-[40px] overflow-hidden shadow-xl shadow-black/5">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-zinc-900">{member.name}</h4>
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">{member.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
