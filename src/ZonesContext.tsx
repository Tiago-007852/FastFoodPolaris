import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { DeliveryZone } from './types';
import { handleFirestoreError, OperationType } from './firestoreUtils';

/**
 * Default delivery zones for Huambo (Feature 3).
 * These are used when the admin has not configured any zone in Firestore yet,
 * so the delivery flow always works. Ids are prefixed with "default-" so the
 * admin panel can tell they have not been persisted yet.
 */
export const DEFAULT_ZONES: DeliveryZone[] = [
  { id: 'default-centro', name: 'Centro', neighborhoods: ['Cidade Alta', 'Mercado Central', 'Vila Teixeira'], fee: 300, timeMin: 15, timeMax: 25, order: 1, enabled: true },
  { id: 'default-norte', name: 'Norte', neighborhoods: ['Tchavola', 'Calima', 'Luvemba'], fee: 500, timeMin: 25, timeMax: 35, order: 2, enabled: true },
  { id: 'default-sul', name: 'Sul', neighborhoods: ['Caála', 'São João', 'Água Fria'], fee: 600, timeMin: 30, timeMax: 40, order: 3, enabled: true },
  { id: 'default-leste', name: 'Leste', neighborhoods: ['Casseque', 'Bela Vista', 'Lounalui'], fee: 500, timeMin: 25, timeMax: 35, order: 4, enabled: true },
  { id: 'default-oeste', name: 'Oeste', neighborhoods: ['Kamussamba', 'Lalula', 'São Pedro'], fee: 550, timeMin: 30, timeMax: 40, order: 5, enabled: true },
  { id: 'default-universitaria', name: 'Zona Universitária', neighborhoods: ['UJES', 'ISPUNIV', 'ISCED'], fee: 400, timeMin: 20, timeMax: 30, order: 6, enabled: true },
];

/**
 * Bairros of Huambo the customer can choose from. Each bairro points to the
 * zone that covers it (matched by zone NAME, so it works with both the
 * hardcoded defaults and the admin-managed Firestore documents).
 * The admin panel can still add/remove neighborhoods per zone — anything
 * configured there shows up in the list as well.
 */
export const HUAMBO_AREAS: { name: string; zoneName: string }[] = [
  { name: 'Cidade Alta', zoneName: 'Centro' },
  { name: 'Mercado Central', zoneName: 'Centro' },
  { name: 'Vila Teixeira', zoneName: 'Centro' },
  { name: 'Kalunga', zoneName: 'Centro' },
  { name: 'Benfica', zoneName: 'Centro' },
  { name: 'Mwangolé', zoneName: 'Centro' },
  { name: 'Tchavola', zoneName: 'Norte' },
  { name: 'Camapata', zoneName: 'Norte' },
  { name: 'Calima', zoneName: 'Norte' },
  { name: 'Luvemba', zoneName: 'Norte' },
  { name: 'Caála', zoneName: 'Sul' },
  { name: 'Bengui', zoneName: 'Sul' },
  { name: 'São João', zoneName: 'Sul' },
  { name: 'Água Fria', zoneName: 'Sul' },
  { name: 'Casseque', zoneName: 'Leste' },
  { name: 'Bela Vista', zoneName: 'Leste' },
  { name: 'Lounalui', zoneName: 'Leste' },
  { name: 'Kamussamba', zoneName: 'Oeste' },
  { name: 'Lalula', zoneName: 'Oeste' },
  { name: 'São Pedro', zoneName: 'Oeste' },
  { name: 'UJES', zoneName: 'Zona Universitária' },
  { name: 'ISPUNIV', zoneName: 'Zona Universitária' },
  { name: 'ISCED', zoneName: 'Zona Universitária' },
  { name: 'IDUM', zoneName: 'Zona Universitária' },
];

/** A bairro the customer can pick, already resolved to its delivery zone. */
export interface DeliveryArea {
  /** Bairro name, e.g. "Kalunga". */
  name: string;
  /** Zone that covers the bairro (defines fee and estimated time). */
  zone: DeliveryZone;
}

const normalize = (value: string) => value.trim().toLowerCase();

/** "15–25 min" helper used across the delivery UI. */
export const formatEta = (zone: DeliveryZone | null): string =>
  zone ? `${zone.timeMin}–${zone.timeMax} min` : '';

interface ZonesContextType {
  /** All zones (including disabled ones) — used by the admin panel */
  zones: DeliveryZone[];
  /** Only enabled zones — used by the customer-facing delivery flow */
  enabledZones: DeliveryZone[];
  /** Bairros of Huambo available to choose from, each with its zone. */
  areas: DeliveryArea[];
  /** Bairro currently chosen by the customer ('' when nothing is chosen). */
  selectedArea: string;
  selectArea: (areaName: string) => void;
  /** Zone that covers the chosen bairro — null until the customer chooses. */
  selectedZone: DeliveryZone | null;
}

const ZonesContext = createContext<ZonesContextType | undefined>(undefined);

const ZONE_STORAGE_KEY = 'polaris_selected_zone';
const AREA_STORAGE_KEY = 'polaris_delivery_area';

export const ZonesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with the hardcoded defaults so the site works even before seeding
  const [zones, setZones] = useState<DeliveryZone[]>(DEFAULT_ZONES);
  const [selectedArea, setSelectedArea] = useState<string>(() => {
    try {
      return localStorage.getItem(AREA_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Live subscription to the admin-managed zone collection
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'deliveryZones'), orderBy('order')), (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DeliveryZone));
      if (fetched.length > 0) setZones(fetched);
      // Empty collection keeps the hardcoded defaults above
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'deliveryZones', false);
    });
    return () => unsub();
  }, []);

  const enabledZones = zones.filter(z => z.enabled !== false);

  /**
   * Bairros the customer can choose from: first the neighborhoods configured by
   * the admin on each zone, then the built-in Huambo coverage for any zone that
   * still has free slots. Sorted alphabetically.
   */
  const areas = useMemo<DeliveryArea[]>(() => {
    const list: DeliveryArea[] = [];
    const seen = new Set<string>();
    const add = (name: string | undefined, zone: DeliveryZone | undefined) => {
      const key = normalize(name || '');
      if (!key || seen.has(key) || !zone) return;
      seen.add(key);
      list.push({ name: (name || '').trim(), zone });
    };

    enabledZones.forEach(z => (z.neighborhoods || []).forEach(n => add(n, z)));
    HUAMBO_AREAS.forEach(a => {
      add(a.name, enabledZones.find(z => normalize(z.name) === normalize(a.zoneName)));
    });

    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [enabledZones]);

  // Drop a persisted bairro that is no longer available (zone disabled/removed).
  useEffect(() => {
    if (!selectedArea) return;
    if (!areas.some(a => normalize(a.name) === normalize(selectedArea))) {
      setSelectedArea('');
      try {
        localStorage.removeItem(AREA_STORAGE_KEY);
        localStorage.removeItem(ZONE_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [areas, selectedArea]);

  /** Selects the delivery bairro and persists it for the whole order flow. */
  const selectArea = (areaName: string) => {
    setSelectedArea(areaName);
    try {
      localStorage.setItem(AREA_STORAGE_KEY, areaName);
      const zone = areas.find(a => normalize(a.name) === normalize(areaName))?.zone;
      if (zone) localStorage.setItem(ZONE_STORAGE_KEY, zone.id);
    } catch {
      // localStorage unavailable — selection still lives in state
    }
  };

  // No bairro is preselected: the customer always chooses their own zone.
  const selectedZone = areas.find(a => normalize(a.name) === normalize(selectedArea))?.zone || null;

  return (
    <ZonesContext.Provider value={{ zones, enabledZones, areas, selectedArea, selectArea, selectedZone }}>
      {children}
    </ZonesContext.Provider>
  );
};

export const useZones = () => {
  const ctx = useContext(ZonesContext);
  if (!ctx) throw new Error('useZones must be used within a ZonesProvider');
  return ctx;
};
