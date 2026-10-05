import { pool, query } from './db';
import { createRow, createMenuItem, updateRow, RESOURCES, SETTINGS_DEF, ABOUT_DEF } from './resources';

/**
 * Default site content (ported from the old `src/seed.ts` Firestore seed).
 * Ids are deterministic so re-seeding replaces the content instead of
 * duplicating it. Triggered from the admin panel ("Resetar/Atualizar Menu").
 */

const SETTINGS = {
  restaurantName: 'Polaris Fast-Food',
  slogan: 'Onde o apetite encontra direção.',
  address: 'Bairro Benfica, Huambo, Angola',
  phone: '+244 923 456 789',
  whatsapp: '+244 923 456 789',
  instagram: '@polaris_huambo',
  email: 'contacto@polaris.com',
  openingHours: 'Seg - Dom: 11:00 - 23:00',
  deliveryFee: 1000.0,
  heroImage: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=2070&auto=format&fit=crop',
  googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.456789012345!2d15.73456789012345!3d-12.712345678901234!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDQyJzQ0LjQiUyAxNcKwNDQnMDQuNCJF!5e0!3m2!1spt-PT!2sao!4v1234567890123',
  countdownEnabled: true,
  countdownTargetDate: '2026-10-09T09:00:00+01:00',
  // Admin-editable background video for the countdown section.
  countdownBgVideo: '/videos/countdown-bg.mp4',
};

const ABOUT = {
  heroImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop',
  storyTitle: 'Nossa História',
  storySubtitle: 'Polaris: Onde o apetite encontra direção.',
  storyText1: 'Polaris nasceu da ideia de algo simples, mas poderoso: ser o ponto de referência no meio de tantas escolhas. Assim como a Estrela Polaris guia viajantes durante a noite, o teu fast-food nasceu com a missão de guiar pessoas até ao verdadeiro sabor.',
  storyText2: 'Em um mundo cheio de opções rápidas e comuns, a Polaris representa qualidade que não se perde, sabor que marca e uma experiência que fica na memória. No Huambo, a Polaris não é apenas um lugar para comer — é o ponto onde o apetite encontra direção. Cada hambúrguer é preparado com o objetivo de ser mais do que comida: é uma experiência que "orienta" o cliente de volta.',
  storyImage: 'https://images.unsplash.com/photo-1577214495773-51465d5061df?q=80&w=1974&auto=format&fit=crop',
  quote: '"Onde o apetite encontra direção."',
  quoteAuthor: 'Polaris Team',
};

const CATEGORIES = [
  { id: 'cat-hamburgueres', name: 'Hambúrgueres', order: 1 },
  { id: 'cat-pratos', name: 'Pratos Principais', order: 2 },
  { id: 'cat-acompanhamentos', name: 'Acompanhamentos', order: 3 },
  { id: 'cat-bebidas', name: 'Bebidas', order: 4 },
  { id: 'cat-sobremesas', name: 'Sobremesas', order: 5 },
];

const COMMON_EXTRAS = [
  { name: 'Maionese', price: 500.0 },
  { name: 'Ketchup', price: 0.0 },
  { name: 'Mostarda', price: 0.0 },
  { name: 'Picante', price: 0.0 },
  { name: 'Queijo Extra', price: 1500.0 },
  { name: 'Bacon Extra', price: 2000.0 },
  { name: 'Ovo', price: 1000.0 },
];

const MENU_ITEMS: Array<{ id: string; categoryId: string } & Record<string, any>> = [
  {
    id: 'item-burger-simples',
    name: 'Burger Simples',
    description: 'Hambúrguer de carne bovina 120g, queijo, alface e tomate.',
    price: 7500.0,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1974&auto=format&fit=crop',
    categoryId: 'cat-hamburgueres',
    isPopular: true,
    extras: COMMON_EXTRAS,
  },
  {
    id: 'item-burger-duplo',
    name: 'Burger Duplo',
    description: 'Dois hambúrgueres de 120g, dobro de queijo, alface e tomate.',
    price: 10500.0,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1965&auto=format&fit=crop',
    categoryId: 'cat-hamburgueres',
    isPopular: true,
    extras: COMMON_EXTRAS,
  },
  {
    id: 'item-cachorro-quente',
    name: 'Cachorro-quente (Hot Dog)',
    description: 'Salsicha premium, pão macio, batata palha, ketchup e mostarda.',
    price: 5000.0,
    image: 'https://images.unsplash.com/photo-1541214113241-21578d2d9b62?q=80&w=2070&auto=format&fit=crop',
    categoryId: 'cat-pratos',
    extras: COMMON_EXTRAS,
  },
  {
    id: 'item-sanduiche-frango',
    name: 'Sanduíche de Frango',
    description: 'Peito de frango grelhado, maionese, alface e tomate no pão de cereais.',
    price: 6500.0,
    image: 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?q=80&w=2070&auto=format&fit=crop',
    categoryId: 'cat-pratos',
    extras: COMMON_EXTRAS,
  },
  {
    id: 'item-sanduiche-carne',
    name: 'Sanduíche de Carne',
    description: 'Tiras de carne bovina, queijo derretido e cebola grelhada.',
    price: 7500.0,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=2073&auto=format&fit=crop',
    categoryId: 'cat-pratos',
    extras: COMMON_EXTRAS,
  },
  {
    id: 'item-sanduiche-ovo',
    name: 'Sanduíche de Ovo',
    description: 'Ovo estrelado, queijo e bacon no pão brioche.',
    price: 5500.0,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=2080&auto=format&fit=crop',
    categoryId: 'cat-pratos',
    extras: COMMON_EXTRAS,
  },
  {
    id: 'item-churros',
    name: 'Churros',
    description: 'Churros crocantes polvilhados com açúcar e canela, servidos com doce de leite.',
    price: 4000.0,
    image: 'https://images.unsplash.com/photo-1561626423-a51b45aef0a1?q=80&w=2070&auto=format&fit=crop',
    categoryId: 'cat-pratos',
  },
  {
    id: 'item-batata-normal',
    name: 'Batata Frita Normal',
    description: 'Porção generosa de batatas fritas crocantes.',
    price: 3500.0,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=1974&auto=format&fit=crop',
    categoryId: 'cat-acompanhamentos',
  },
  {
    id: 'item-batata-queijo',
    name: 'Batata Frita com Queijo',
    description: 'Batatas fritas cobertas com molho de queijo cheddar derretido.',
    price: 5000.0,
    image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?q=80&w=2070&auto=format&fit=crop',
    categoryId: 'cat-acompanhamentos',
  },
  {
    id: 'item-batata-rustica',
    name: 'Batata Rústica',
    description: 'Batatas cortadas à mão com casca, temperadas com alecrim e alho.',
    price: 4500.0,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=1974&auto=format&fit=crop',
    categoryId: 'cat-acompanhamentos',
    isPopular: true,
  },
  {
    id: 'item-refrigerante',
    name: 'Refrigerante',
    description: 'Lata 330ml (Coca-Cola, Sumol, Fanta).',
    price: 2000.0,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=2070&auto=format&fit=crop',
    categoryId: 'cat-bebidas',
  },
  {
    id: 'item-sumo-natural',
    name: 'Sumo Natural',
    description: 'Sumo de laranja espremido na hora.',
    price: 3500.0,
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=1974&auto=format&fit=crop',
    categoryId: 'cat-bebidas',
  },
  {
    id: 'item-agua-normal',
    name: 'Água Normal',
    description: 'Garrafa 500ml.',
    price: 1000.0,
    image: 'https://images.unsplash.com/photo-1523362628744-0c14a394dbb1?q=80&w=2071&auto=format&fit=crop',
    categoryId: 'cat-bebidas',
  },
  {
    id: 'item-agua-mineral',
    name: 'Água Mineral',
    description: 'Água com gás 250ml.',
    price: 1500.0,
    image: 'https://images.unsplash.com/photo-1559839914-17aae19cea0e?q=80&w=1974&auto=format&fit=crop',
    categoryId: 'cat-bebidas',
  },
  {
    id: 'item-milkshake',
    name: 'Milkshake',
    description: 'Gelado batido com leite e topping (Chocolate, Morango ou Baunilha).',
    price: 5500.0,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=1974&auto=format&fit=crop',
    categoryId: 'cat-bebidas',
    isPopular: true,
  },
  {
    id: 'item-sumo-garrafa',
    name: 'Sumo em Garrafa',
    description: 'Compal ou similar (Pêssego, Pêra, Manga).',
    price: 2500.0,
    image: 'https://images.unsplash.com/photo-1600271886332-699bb2798bda?q=80&w=1974&auto=format&fit=crop',
    categoryId: 'cat-bebidas',
  },
  {
    id: 'item-gelado',
    name: 'Gelado (Sorvete)',
    description: 'Duas bolas de gelado artesanal à escolha.',
    price: 4500.0,
    image: 'https://images.unsplash.com/photo-1501443762994-82bd5dabb892?q=80&w=2070&auto=format&fit=crop',
    categoryId: 'cat-sobremesas',
  },
  {
    id: 'item-bolo',
    name: 'Bolo Simples',
    description: 'Fatia de bolo caseiro (Laranja ou Chocolate).',
    price: 3000.0,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=2089&auto=format&fit=crop',
    categoryId: 'cat-sobremesas',
  },
];

const REVIEWS = [
  { id: 'review-1', userName: 'João Silva', comment: 'O melhor hambúrguer da cidade! Chegou super rápido e quentinho.', rating: 5, isApproved: true },
  { id: 'review-2', userName: 'Maria Santos', comment: 'As batatas rústicas são divinais. Recomendo vivamente.', rating: 5, isApproved: true },
  { id: 'review-3', userName: 'Pedro Oliveira', comment: 'Muito bom, mas a taxa de entrega podia ser mais baixa.', rating: 4, isApproved: true },
];

const GALLERY = [
  { id: 'gallery-1', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop', title: 'Nossas Pizzas', category: 'Comida', order: 1 },
  { id: 'gallery-2', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1974&auto=format&fit=crop', title: 'Hambúrgueres Premium', category: 'Comida', order: 2 },
  { id: 'gallery-3', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1965&auto=format&fit=crop', title: 'Ambiente Moderno', category: 'Restaurante', order: 3 },
  { id: 'gallery-4', url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=2069&auto=format&fit=crop', title: 'Ingredientes Frescos', category: 'Cozinha', order: 4 },
  { id: 'gallery-5', url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop', title: 'Nossa Equipa', category: 'Equipa', order: 5 },
  { id: 'gallery-6', url: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?q=80&w=1974&auto=format&fit=crop', title: 'Bebidas Geladas', category: 'Bebidas', order: 6 },
  { id: 'gallery-7', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=2032&auto=format&fit=crop', title: 'Sobremesas Deliciosas', category: 'Sobremesas', order: 7 },
  { id: 'gallery-8', url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=2071&auto=format&fit=crop', title: 'O Melhor Atendimento', category: 'Restaurante', order: 8 },
];

const TEAM = [
  { id: 'team-1', name: 'Ricardo Silva', role: 'Chef Principal', image: 'https://images.unsplash.com/photo-1583394293214-28dea15ee548?q=80&w=1974&auto=format&fit=crop', order: 1 },
  { id: 'team-2', name: 'Ana Costa', role: 'Gerente de Operações', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop', order: 2 },
  { id: 'team-3', name: 'Miguel Santos', role: 'Especialista em Grelhados', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop', order: 3 },
  { id: 'team-4', name: 'Sofia Oliveira', role: 'Pastry Chef', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop', order: 4 },
];

const BANNERS = [
  {
    id: 'banner-1',
    title: 'Novo Burger Polaris Duplo',
    subtitle: 'Duas carnes suculentas, queijo derretido e o nosso molho secreto. Experimenta a novidade que já chegou ao Huambo.',
    mediaUrl: '/images/hero/hero-burger.jpg',
    mediaType: 'image',
    ctaLabel: 'Pedir Agora',
    ctaLink: '/menu',
    badge: 'Novidade',
    placement: 'hero',
    order: 1,
    active: true,
  },
  {
    id: 'banner-2',
    title: 'Combo Familiar',
    subtitle: '2 burgers + batatas gigantes + 4 bebidas por apenas Kz25.000. Perfeito para partilhar em casa.',
    mediaUrl: '/images/hero/hero-burger-fries.jpg',
    mediaType: 'image',
    ctaLabel: 'Pedir Agora',
    ctaLink: '/menu',
    badge: 'Promoção',
    placement: 'both',
    order: 2,
    active: true,
  },
  {
    id: 'banner-3',
    title: 'Entregamos em todo o Huambo',
    subtitle: 'Peça agora e receba em casa em 15 a 40 minutos, consoante a sua zona.',
    mediaUrl: '/images/hero/hero-sobremesa.jpg',
    mediaType: 'video',
    ctaLabel: 'Pedir Agora',
    ctaLink: '/menu',
    badge: '',
    placement: 'hero',
    order: 3,
    active: true,
  },
  {
    id: 'banner-4',
    title: 'Sexta do Milkshake',
    subtitle: 'Nas sextas-feiras, todo o sexto milkshake é por nossa conta. Não fiques de fora!',
    mediaUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=1974&auto=format&fit=crop',
    mediaType: 'image',
    ctaLabel: '',
    ctaLink: '/menu',
    badge: 'Promoção',
    placement: 'grid',
    order: 4,
    active: true,
  },
  {
    id: 'banner-5',
    title: 'Bastidores da Cozinha',
    subtitle: 'Vê como preparamos os teus pratos favoritos, do grelho à tua mesa.',
    mediaUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    mediaType: 'video',
    ctaLabel: '',
    ctaLink: '/menu',
    badge: 'Evento',
    placement: 'grid',
    order: 5,
    active: true,
  },
];

const TEASERS = [
  { id: 'teaser-1', name: 'Burger Simples', description: 'Pão, carne, queijo e molho da casa', image: '/images/teasers/burger-simples.jpg', order: 1, enabled: true },
  { id: 'teaser-2', name: 'Burger Duplo', description: 'Duas carnes, queijo derretido e bacon', image: '/images/teasers/burger-duplo.jpg', order: 2, enabled: true },
  { id: 'teaser-3', name: 'Cachorro-quente', description: 'Salsicha grelhada com molho e batata', image: '/images/teasers/hot-dog.jpg', order: 3, enabled: true },
  { id: 'teaser-4', name: 'Sanduíche de Frango', description: 'Frango grelhado, queijo e salada', image: '/images/teasers/sanduiche-frango.jpg', order: 4, enabled: true },
  { id: 'teaser-5', name: 'Sanduíche de Carne', description: 'Carne fatiada com queijo derretido', image: '/images/teasers/sanduiche-carne.jpg', order: 5, enabled: true },
  { id: 'teaser-6', name: 'Batata Frita com Queijo', description: 'Batatas crocantes cobertas de queijo', image: '/images/teasers/batata-queijo.jpg', order: 6, enabled: true },
];

const ZONES = [
  { id: 'zona-centro', name: 'Centro', neighborhoods: ['Cidade Alta', 'Mercado Central', 'Vila Teixeira'], fee: 300, timeMin: 15, timeMax: 25, order: 1, enabled: true },
  { id: 'zona-norte', name: 'Norte', neighborhoods: ['Tchavola', 'Calima', 'Luvemba'], fee: 500, timeMin: 25, timeMax: 35, order: 2, enabled: true },
  { id: 'zona-sul', name: 'Sul', neighborhoods: ['Caála', 'São João', 'Água Fria'], fee: 600, timeMin: 30, timeMax: 40, order: 3, enabled: true },
  { id: 'zona-leste', name: 'Leste', neighborhoods: ['Casseque', 'Bela Vista', 'Lounalui'], fee: 500, timeMin: 25, timeMax: 35, order: 4, enabled: true },
  { id: 'zona-oeste', name: 'Oeste', neighborhoods: ['Kamussamba', 'Lalula', 'São Pedro'], fee: 550, timeMin: 30, timeMax: 40, order: 5, enabled: true },
  { id: 'zona-universitaria', name: 'Zona Universitária', neighborhoods: ['UJES', 'ISPUNIV', 'ISCED'], fee: 400, timeMin: 20, timeMax: 30, order: 6, enabled: true },
];

/** Wipes the content tables and reloads the defaults (admin panel button). */
export async function seedContent() {
  await pool.query(
    `truncate menu_item_sizes, menu_item_extras, menu_items, categories, reviews,
             gallery_images, team_members, banners, delivery_zones, dish_ratings, teasers restart identity cascade`,
  );

  await query(`insert into site_settings (id) values ('main') on conflict (id) do nothing`);
  await query(`insert into about_content (id) values ('about') on conflict (id) do nothing`);
  await updateRow(SETTINGS_DEF, 'main', SETTINGS);
  await updateRow(ABOUT_DEF, 'about', ABOUT);

  for (const category of CATEGORIES) await createRow(RESOURCES.categories, category, category.id);
  for (const item of MENU_ITEMS) await createMenuItem(item);
  for (const review of REVIEWS) await createRow(RESOURCES.reviews, review, review.id);
  for (const image of GALLERY) await createRow(RESOURCES.gallery, image, image.id);
  for (const member of TEAM) await createRow(RESOURCES.team, member, member.id);
  for (const banner of BANNERS) await createRow(RESOURCES.banners, banner, banner.id);
  for (const teaser of TEASERS) await createRow(RESOURCES.teasers, teaser, teaser.id);
  for (const zone of ZONES) await createRow(RESOURCES.zones, zone, zone.id);

  return {
    categories: CATEGORIES.length,
    menuItems: MENU_ITEMS.length,
    reviews: REVIEWS.length,
    gallery: GALLERY.length,
    team: TEAM.length,
    banners: BANNERS.length,
    teasers: TEASERS.length,
    zones: ZONES.length,
  };
}

