BEGIN;

CREATE TABLE IF NOT EXISTS public.user_avatars (
    user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
    image_webp bytea NOT NULL CHECK (octet_length(image_webp) BETWEEN 1 AND 262144),
    version uuid NOT NULL DEFAULT gen_random_uuid()
);

COMMIT;
