BEGIN;
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  identity_status text NOT NULL DEFAULT 'not_started' CHECK (identity_status IN ('not_started', 'pending', 'needs_attention', 'verified')),
  payout_status text NOT NULL DEFAULT 'not_started' CHECK (payout_status IN ('not_started', 'pending', 'needs_attention', 'verified')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_listing_drafts (
  seller_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  fields jsonb NOT NULL CHECK (jsonb_typeof(fields) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_listings (
  id uuid PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  category text NOT NULL,
  subcategory text NOT NULL,
  platform text NOT NULL,
  title varchar(120) NOT NULL,
  price_paise integer NOT NULL CHECK (price_paise > 0),
  description text NOT NULL,
  prerequisites text NOT NULL,
  setup_guide text NOT NULL,
  delivery_url text CHECK (delivery_url IS NULL OR length(delivery_url) <= 2048),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_listings_owner ON public.seller_listings(seller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.seller_listing_files (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.seller_listings(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('cover', 'image', 'video', 'pdf', 'main', 'extra')),
  original_name text NOT NULL CHECK (length(original_name) BETWEEN 1 AND 180),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 52428800)
);
CREATE INDEX IF NOT EXISTS idx_seller_listing_files_listing ON public.seller_listing_files(listing_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_listing_files_singletons
  ON public.seller_listing_files(listing_id, role) WHERE role IN ('cover', 'video', 'pdf', 'main');
COMMIT;
