import React, { createContext, useContext } from 'react';
import { Category, MenuItem, SiteSettings, Review, GalleryImage, TeamMember, AboutContent, Banner, DishRating, Teaser } from './types';
import { useLiveResource } from './lib/useLiveResource';

interface SiteContextType {
  categories: Category[];
  menuItems: MenuItem[];
  settings: SiteSettings | null;
  reviews: Review[];
  gallery: GalleryImage[];
  team: TeamMember[];
  about: AboutContent | null;
  /** Hero carousel / promotions grid banners (Feature 1) */
  banners: Banner[];
  /** Per-dish ratings submitted by customers (Feature 4) */
  dishRatings: DishRating[];
  /** Countdown teaser cards ("O que está a chegar") — admin editable */
  teasers: Teaser[];
  /** False when the banners request failed (API down) — the UI then uses local defaults */
  bannersAvailable: boolean;
  loading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

/**
 * All site content now comes from the Postgres API (`/api/*`) instead of Firestore.
 * Each resource is refetched automatically when the admin panel changes it.
 */
export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const categories = useLiveResource<Category[]>('categories', []);
  const menuItems = useLiveResource<MenuItem[]>('menuItems', []);
  const settings = useLiveResource<SiteSettings | null>('settings', null);
  const reviews = useLiveResource<Review[]>('reviews', []);
  const gallery = useLiveResource<GalleryImage[]>('gallery', []);
  const team = useLiveResource<TeamMember[]>('team', []);
  const about = useLiveResource<AboutContent | null>('about', null);
  const banners = useLiveResource<Banner[]>('banners', []);
  const dishRatings = useLiveResource<DishRating[]>('dishRatings', []);
  const teasers = useLiveResource<Teaser[]>('teasers', []);

  return (
    <SiteContext.Provider
      value={{
        categories: categories.data,
        menuItems: menuItems.data,
        settings: settings.data,
        reviews: reviews.data,
        gallery: gallery.data,
        team: team.data,
        about: about.data,
        banners: banners.data,
        dishRatings: dishRatings.data,
        teasers: teasers.data,
        bannersAvailable: banners.available,
        loading: about.loading,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useSite must be used within a SiteProvider');
  return context;
};