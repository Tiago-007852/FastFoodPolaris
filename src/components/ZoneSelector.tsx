import React from 'react';
import { ChevronDown, MapPin, Clock, Truck } from 'lucide-react';
import { DeliveryZone } from '../types';
import { useZones, formatEta } from '../ZonesContext';
import { useToast } from './ToastProvider';

interface ZoneSelectorProps {
  /** "dropdown" = compact selector (menu header) · "cards" = interactive card grid (checkout) */
  variant?: 'dropdown' | 'cards';
}

/**
 * Feature 3 — Delivery zone selector for Huambo.
 * Shows the fee, estimated time and covered neighborhoods of the selected zone.
 * The selection persists (localStorage) through the whole order flow.
 */
export const ZoneSelector: React.FC<ZoneSelectorProps> = ({ variant = 'dropdown' }) => {
  const { enabledZones, selectedZone, selectZone } = useZones();
  const { showToast } = useToast();

  if (enabledZones.length === 0) return null;

  const handleSelect = (zone: DeliveryZone) => {
    if (zone.id !== selectedZone?.id) {
      selectZone(zone.id);
      showToast(`Zona ${zone.name} selecionada • Taxa Kz${zone.fee} • ${formatEta(zone)}`, 'info');
    }
  };

  // ---------- Dropdown variant (compact, menu header) ----------
  if (variant === 'dropdown') {
    return (
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Truck size={14} />
          Zona de Entrega
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
          <select
            value={selectedZone?.id || ''}
            onChange={(e) => {
              const zone = enabledZones.find(z => z.id === e.target.value);
              if (zone) handleSelect(zone);
            }}
            className="w-full appearance-none pl-11 pr-10 py-4 bg-white border border-black/5 rounded-2xl font-bold text-zinc-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
          >
            {enabledZones.map(z => (
              <option key={z.id} value={z.id}>
                {z.name} — Kz{z.fee} · {formatEta(z)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
        </div>
        {selectedZone && (
          <div className="flex flex-wrap gap-2">
            {selectedZone.neighborhoods.map(n => (
              <span key={n} className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-medium text-zinc-600">
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Card grid variant (checkout) ----------
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {enabledZones.map(zone => {
          const selected = zone.id === selectedZone?.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => handleSelect(zone)}
              className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all space-y-1 ${
                selected
                  ? 'bg-secondary/10 border-secondary shadow-lg shadow-secondary/10'
                  : 'bg-white border-black/5 hover:border-secondary/50'
              }`}
            >
              <span className="text-sm font-bold text-zinc-900">{zone.name}</span>
              <span className="text-xs font-black text-primary">Kz{zone.fee}</span>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Clock size={11} />
                {formatEta(zone)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected zone details: fee, estimated time and covered neighborhoods */}
      {selectedZone && (
        <div className="p-5 bg-zinc-50 rounded-2xl border border-black/5 space-y-3">
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
          <div className="flex flex-wrap gap-2">
            {selectedZone.neighborhoods.map(n => (
              <span key={n} className="px-3 py-1 bg-white border border-black/5 rounded-full text-xs font-medium text-zinc-600">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
