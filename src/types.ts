export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  isPopular?: boolean;
  isPromo?: boolean;
  /** "Novidade" badge */
  isNew?: boolean;
  /** false = "Esgotado" (out of stock). Missing field means available (safe default). */
  isAvailable?: boolean;
  /** Estimated preparation time in minutes (shown on the dish card) */
  prepTimeMinutes?: number;
  /** Comma separated ingredient list — also powers the "remove ingredient" customization */
  ingredients?: string;
  /** Allergen information shown in the details modal */
  allergens?: string;
  /** Nutritional information shown in the details modal */
  nutritionInfo?: string;
  /** Portion/size options. `price` is the TOTAL price of that portion (base price is replaced). */
  sizes?: { name: string; price: number }[];
  /** Paid add-ons (existing feature, also used by the customization modal) */
  extras?: { name: string; price: number }[];
}

/**
 * Hero carousel / promotions grid media item.
 * Supports direct image URLs, direct MP4 URLs and YouTube links.
 */
export interface Banner {
  id: string;
  /** Headline */
  title: string;
  /** Subtext */
  subtitle: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  ctaLabel?: string;
  ctaLink?: string;
  badge?: 'Promoção' | 'Novidade' | 'Evento' | '';
  /** Where the banner is displayed: hero carousel, promotions grid, or both */
  placement: 'hero' | 'grid' | 'both';
  order: number;
  active: boolean;
  /** Inactive before this date (yyyy-mm-dd). Empty = always active. */
  activeFrom?: string;
  /** Inactive after this date (yyyy-mm-dd). Empty = always active. */
  activeTo?: string;
}

/** Huambo delivery zone (Feature 3) */
export interface DeliveryZone {
  id: string;
  name: string;
  neighborhoods: string[];
  /** Delivery fee in Kwanza */
  fee: number;
  /** Estimated delivery time in minutes */
  timeMin: number;
  timeMax: number;
  order: number;
  enabled: boolean;
}

/** Per-dish rating submitted from the "Avaliar Prato" modal (Feature 4) */
export interface DishRating {
  id: string;
  dishId: string;
  userName: string;
  rating: number;
  comment?: string;
  date: any;
  /** Hidden reviews are excluded from averages and public lists */
  isHidden?: boolean;
}

export interface SiteSettings {
  restaurantName: string;
  slogan: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  email: string;
  openingHours: string;
  deliveryFee: number;
  heroImage: string;
  googleMapsUrl: string;
  /** ISO datetime of the launch countdown target (Angola, UTC+1). Feature 6. */
  countdownTargetDate?: string;
  /** Master switch for the countdown section */
  countdownEnabled?: boolean;
  /** Background video of the countdown section (MP4 URL or data URL). Admin editable. */
  countdownBgVideo?: string;
  /** Segundo número de WhatsApp (ex.: WhatsApp geral/atendimento). Opcional. */
  contactPhone?: string;
  /** Etiqueta para o segundo número de WhatsApp. Opcional. */
  contactPhoneLabel?: string;
}

/** Teaser card shown in the countdown section ("O que está a chegar"). Admin editable. */
export interface Teaser {
  id: string;
  name: string;
  description: string;
  image: string;
  order: number;
  enabled: boolean;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
  order: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  order: number;
}

export interface AboutContent {
  heroImage: string;
  storyTitle: string;
  storySubtitle: string;
  storyText1: string;
  storyText2: string;
  storyImage: string;
  quote: string;
  quoteAuthor: string;
}

export interface Review {
  id: string;
  userName: string;
  comment: string;
  rating: number;
  date: any;
  isApproved?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedExtras: { name: string; price: number }[];
}
