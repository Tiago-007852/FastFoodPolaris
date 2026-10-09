-- =============================================================================
-- Polaris FastFood — Postgres schema (Neon)
-- Replaces the Firestore collections. Safe to run repeatedly (idempotent).
-- =============================================================================

-- ---------- Auth (Better Auth core schema) ----------------------------------
-- Better Auth expects camelCase column names, so these tables keep that casing.

create table if not exists "user" (
  id             text primary key,
  name           text not null default '',
  email          text not null unique,
  "emailVerified" boolean not null default false,
  image          text,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now(),
  -- app-specific (previously the `users` Firestore collection)
  role           text not null default 'user' check (role in ('visitor','user','admin')),
  "lastLogin"    timestamptz
);

create table if not exists "session" (
  id          text primary key,
  "expiresAt" timestamptz not null,
  token       text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId"    text not null references "user"(id) on delete cascade
);
create index if not exists session_user_id_idx on "session"("userId");

create table if not exists "account" (
  id                     text primary key,
  "accountId"            text not null,
  "providerId"           text not null,
  "userId"               text not null references "user"(id) on delete cascade,
  "accessToken"          text,
  "refreshToken"         text,
  "idToken"              text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope                  text,
  password               text,
  "createdAt"            timestamptz not null default now(),
  "updatedAt"            timestamptz not null default now()
);
create index if not exists account_user_id_idx on "account"("userId");

create table if not exists "verification" (
  id          text primary key,
  identifier  text not null,
  value       text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists verification_identifier_idx on "verification"(identifier);

-- ---------- Content ----------------------------------------------------------

create table if not exists categories (
  id          text primary key,
  name        text not null,
  order_index int not null default 0
);

create table if not exists menu_items (
  id                text primary key,
  name              text not null,
  description       text not null default '',
  price             numeric(10,2) not null default 0,
  image             text not null default '',
  category_id       text references categories(id) on delete set null,
  is_popular        boolean not null default false,
  is_promo          boolean not null default false,
  is_new            boolean not null default false,
  is_available      boolean not null default true,
  prep_time_minutes int,
  ingredients       text,
  allergens         text,
  nutrition_info    text
);
create index if not exists menu_items_category_idx on menu_items(category_id);

-- Portion options ("sizes") and paid add-ons ("extras") were arrays in Firestore.
create table if not exists menu_item_sizes (
  menu_item_id text not null references menu_items(id) on delete cascade,
  name         text not null,
  price        numeric(10,2) not null default 0,
  primary key (menu_item_id, name)
);

create table if not exists menu_item_extras (
  menu_item_id text not null references menu_items(id) on delete cascade,
  name         text not null,
  price        numeric(10,2) not null default 0,
  primary key (menu_item_id, name)
);

-- Single-row tables (id 'main' / 'about') replacing the siteSettings documents.
create table if not exists site_settings (
  id                     text primary key default 'main' check (id = 'main'),
  restaurant_name        text not null default '',
  slogan                 text not null default '',
  address                text not null default '',
  phone                  text not null default '',
  whatsapp               text not null default '',
  instagram              text not null default '',
  email                  text not null default '',
  opening_hours          text not null default '',
  delivery_fee           numeric(10,2) not null default 0,
  hero_image             text not null default '',
  google_maps_url        text not null default '',
  countdown_enabled      boolean not null default true,
  countdown_target_date  text
);

alter table site_settings add column if not exists countdown_bg_video text;
-- Launch copy shown inside the countdown section (admin editable).
alter table site_settings add column if not exists launch_message text;

create table if not exists about_content (
  id              text primary key default 'about' check (id = 'about'),
  hero_image      text not null default '',
  story_title     text not null default '',
  story_subtitle  text not null default '',
  story_text1     text not null default '',
  story_text2     text not null default '',
  story_image     text not null default '',
  quote           text not null default '',
  quote_author    text not null default ''
);

-- ---------- Editorial --------------------------------------------------------

create table if not exists reviews (
  id          text primary key,
  user_name   text not null,
  comment     text not null,
  rating      int not null check (rating between 1 and 5),
  is_approved boolean not null default false,
  user_id     text,
  date        timestamptz not null default now()
);
create index if not exists reviews_date_idx on reviews(date desc);

create table if not exists gallery_images (
  id          text primary key,
  url         text not null default '',
  title       text not null default '',
  category    text not null default '',
  order_index int not null default 0
);

create table if not exists team_members (
  id          text primary key,
  name        text not null default '',
  role        text not null default '',
  image       text not null default '',
  order_index int not null default 0
);

create table if not exists banners (
  id          text primary key,
  title       text not null default '',
  subtitle    text not null default '',
  media_url   text not null default '',
  media_type  text not null default 'image' check (media_type in ('image','video')),
  cta_label   text,
  cta_link    text,
  badge       text,
  placement   text not null default 'both' check (placement in ('hero','grid','both')),
  order_index int not null default 0,
  active      boolean not null default true,
  active_from date,
  active_to   date
);

create table if not exists delivery_zones (
  id           text primary key,
  name         text not null,
  neighborhoods text[] not null default '{}',
  fee          numeric(10,2) not null default 0,
  time_min     int not null default 0,
  time_max     int not null default 0,
  order_index  int not null default 0,
  enabled      boolean not null default true
);

create table if not exists dish_ratings (
  id        text primary key,
  dish_id   text not null default '',
  user_name text not null default '',
  rating    int not null default 5 check (rating between 1 and 5),
  comment   text,
  is_hidden boolean not null default false,
  date      timestamptz not null default now()
);
create index if not exists dish_ratings_date_idx on dish_ratings(date desc);

-- Countdown teaser cards ("O que está a chegar") — editable in the admin panel.
create table if not exists teasers (
  id          text primary key,
  name        text not null default '',
  description text not null default '',
  image       text not null default '',
  order_index int not null default 0,
  enabled     boolean not null default true
);

create table if not exists notification_subscribers (
  id         text primary key,
  name       text,
  phone      text not null unique,
  created_at timestamptz not null default now()
);