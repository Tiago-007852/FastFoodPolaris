import React, { createContext, useContext, useEffect, useState } from 'react';
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

/** "15–25 min" helper used across the delivery UI. */
export const formatEta = (zone: DeliveryZone | null): string =>
  zone ? `${zone.timeMin}–${zone.timeMax} min` : '';

interface ZonesContextType {
  /** All zones (including disabled ones) — used by the admin panel */
  zones: DeliveryZone[];
  /** Only enabled zones — used by the customer-facing delivery flow */
  enabledZones: DeliveryZone[];
  selectedZone: DeliveryZone | null;
  selectZone: (zoneId: string) => void;
}

const ZonesContext = createContext<ZonesContextType | undefined>(undefined);

const STORAGE_KEY = 'polaris_selected_zone';

export const ZonesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with the hardcoded defaults so the site works even before seeding
  const [zones, setZones] = useState<DeliveryZone[]>(DEFAULT_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
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
      handleFirestoreError(error, OperationType.GET, 'deliveryZones');
    });
    return () => unsub();
  }, []);

  const enabledZones = zones.filter(z => z.enabled !== false);

  // Keep the persisted selection valid when zones change (deleted/disabled zones)
  useEffect(() => {
    if (enabledZones.length === 0) return;
    if (!selectedZoneId || !enabledZones.some(z => z.id === selectedZoneId)) {
      setSelectedZoneId(enabledZones[0].id);
    }
  }, [enabledZones, selectedZoneId]);

  /** Selects a zone and persists it for the whole order flow (session + localStorage). */
  const selectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    try {
      localStorage.setItem(STORAGE_KEY, zoneId);
    } catch {
      // localStorage unavailable — selection still lives in state
    }
  };

  const selectedZone = enabledZones.find(z => z.id === selectedZoneId) || enabledZones[0] || null;

  return (
    <ZonesContext.Provider value={{ zones, enabledZones, selectedZone, selectZone }}>
      {children}
    </ZonesContext.Provider>
  );
};

export const useZones = () => {
  const ctx = useContext(ZonesContext);
  if (!ctx) throw new Error('useZones must be used within a ZonesProvider');
  return ctx;
};
