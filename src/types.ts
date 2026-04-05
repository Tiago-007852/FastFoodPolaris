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
  extras?: { name: string; price: number }[];
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
