import React, { useMemo, useState } from 'react';
import { ChevronDown, MapPin, Clock, Truck, Search, MessageCircle } from 'lucide-react';
import { DeliveryZone } from '../types';
import { useZones, formatEta, type DeliveryArea } from '../ZonesContext';
import { useToast } from './ToastProvider';

interface ZoneSelectorProps {
  /** "dropdown" = compact selector (menu header) · "cards" = searchable grid (checkout) */
  variant?: 'dropdown' | 'cards';
}

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Feature 3 — Delivery area selector for Huambo.
 * The customer chooses the bairro where the order is delivered (not an abstract
 * zone): the matching zone is resolved automatically and defines the fee and
 * the estimated time. The choice persists (localStorage) through the order flow.
 */
export const ZoneSelector: React.FC<ZoneSelectorProps> = ({ variant = 'dropdown' }) => {
  const { areas, selectedArea, selectArea, selectedZone } = useZones();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');

  const filteredAreas = useMemo(() => {
    const term = normalize(search);
    if (!term) return areas;
    return areas.filter(a => normalize(a.name).includes(term) || normalize(a.zone.name).includes(term));
  }, [areas, search]);

  if (areas.length === 0) return null;

  const handleSelect = (area: DeliveryArea) => {
    if (normalize(area.name) !== normalize(selectedArea)) {
      selectArea(area.name);
      showToast(`${area.name} • Zona ${area.zone.name} • Taxa Kz${area.zone.fee} • ${formatEta(area.zone)}`, 'info');
    }
  };

  // ---------- Dropdown variant (compact, menu header) ----------
  if (variant === 'dropdown') {
    return (
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Truck size={14} />
          Onde entregas em Huambo?
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
          <select
            value={selectedArea}
            onChange={(e) => {
              const area = areas.find(a => normalize(a.name) === normalize(e.target.value));
              if (area) handleSelect(area);
            }}
            className="w-full appearance-none pl-11 pr-10 py-4 bg-white border border-black/5 rounded-2xl font-bold text-zinc-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
          >
            <option value="">Escolhe o teu bairro…</option>
            {areas.map(a => (
              <option key={a.name} value={a.name}>
                {a.name} — Zona {a.zone.name} · Kz{a.zone.fee} · {formatEta(a.zone)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
        </div>
        {selectedArea && selectedZone && (
          <p className="text-xs text-zinc-500">
            Entregamos no bairro <span className="font-bold text-zinc-900">{selectedArea}</span> (zona {selectedZone.name}) • Kz
            {selectedZone.fee} • {formatEta(selectedZone)}
          </p>
        )}
      </div>
    );
  }

  // ---------- Searchable grid variant (checkout) ----------
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-zinc-600">
          Escolhe o bairro onde queres receber o pedido. Só entregamos dentro do Huambo — a taxa e o tempo são calculados
          automaticamente.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Escreve o teu bairro (ex.: Kalunga)…"
          className="w-full pl-11 pr-4 py-4 bg-zinc-50 border border-black/5 rounded-2xl font-bold text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {filteredAreas.length === 0 ? (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-sm font-medium flex items-start gap-3">
          <MessageCircle size={18} className="shrink-0 mt-0.5" />
          <span>
            Esse bairro ainda não está na lista. Só entregamos dentro do Huambo — contacta-nos no WhatsApp paraCombinarmos a
            entrega.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto no-scrollbar pr-1">
          {filteredAreas.map(area => {
            const selected = normalize(area.name) === normalize(selectedArea);
            return (
              <button
                key={area.name}
                type="button"
                onClick={() => handleSelect(area)}
                className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all space-y-1 ${
                  selected
                    ? 'bg-secondary/10 border-secondary shadow-lg shadow-secondary/10'
                    : 'bg-white border-black/5 hover:border-secondary/50'
                }`}
              >
                <span className="text-sm font-bold text-zinc-900 leading-tight">{area.name}</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Zona {area.zone.name}</span>
                <span className="text-xs font-black text-primary">Kz{area.zone.fee}</span>
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Clock size={11} />
                  {formatEta(area.zone)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected bairro summary: zone, fee and estimated time */}
      {selectedArea && selectedZone && (
        <div className="p-5 bg-zinc-50 rounded-2xl border border-black/5 space-y-3">
          <div className="flex items-center gap-2 text-zinc-900 font-black">
            <MapPin size={16} className="text-primary" />
            {selectedArea} — Zona {selectedZone.name}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-primary" />
              <span className="text-sm text-zinc-600">
                Taxa: <span className="font-black text-zinc-900">Kz{selectedZone.fee}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <span className="text-sm text-zinc-600">
                Tempo estimado: <span className="font-black text-zinc-900">{formatEta(selectedZone)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};