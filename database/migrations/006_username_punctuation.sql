BEGIN;
ALTER TABLE public.user_profiles
  DROP CONSTRAINT username_format,
  ADD CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[A-Za-z][A-Za-z0-9_.]{0,49}$');
ALTER TABLE public.pending_registrations
  DROP CONSTRAINT pending_username_format,
  ADD CONSTRAINT pending_username_format CHECK (username ~ '^[A-Za-z][A-Za-z0-9_.]{0,49}$');
COMMIT;
