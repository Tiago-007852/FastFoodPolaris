//sitecontent.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Category, MenuItem, SiteSettings, Review, GalleryImage, TeamMember, AboutContent, Banner, DishRating } from './types';
import { handleFirestoreError, OperationType } from './firestoreUtils';

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
  loading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dishRatings, setDishRatings] = useState<DishRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    });

    const unsubMenuItems = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'menuItems');
    });

    const unsubSettings = onSnapshot(doc(db, 'siteSettings', 'main'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as SiteSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'siteSettings/main');
    });

    const unsubReviews = onSnapshot(query(collection(db, 'reviews'), orderBy('date', 'desc')), (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
    });

    const unsubGallery = onSnapshot(query(collection(db, 'gallery'), orderBy('order')), (snapshot) => {
      setGallery(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'gallery');
    });

    const unsubTeam = onSnapshot(query(collection(db, 'team'), orderBy('order')), (snapshot) => {
      setTeam(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'team');
    });

    const unsubAbout = onSnapshot(doc(db, 'siteSettings', 'about'), (doc) => {
      if (doc.exists()) {
        setAbout(doc.data() as AboutContent);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'siteSettings/about');
    });

    const unsubBanners = onSnapshot(query(collection(db, 'banners'), orderBy('order')), (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'banners');
    });

    const unsubDishRatings = onSnapshot(query(collection(db, 'dishRatings'), orderBy('date', 'desc')), (snapshot) => {
      setDishRatings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DishRating)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'dishRatings');
    });

    return () => {
      unsubCategories();
      unsubMenuItems();
      unsubSettings();
      unsubReviews();
      unsubGallery();
      unsubTeam();
      unsubAbout();
      unsubBanners();
      unsubDishRatings();
    };
  }, []);

  return (
    <SiteContext.Provider value={{ categories, menuItems, settings, reviews, gallery, team, about, banners, dishRatings, loading }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useSite must be used within a SiteProvider');
  return context;
};
