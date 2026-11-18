BEGIN;

ALTER TABLE public.user_profiles
    ADD COLUMN phone_country_iso2 VARCHAR(2),
    ADD COLUMN phone_country_name TEXT,
    ADD COLUMN phone_calling_code VARCHAR(4),
    ADD CONSTRAINT profile_phone_country_valid CHECK (
        (
            phone_country_iso2 IS NULL
            AND phone_country_name IS NULL
            AND phone_calling_code IS NULL
        ) OR (
            phone_country_iso2 IS NOT NULL
            AND phone_country_iso2 ~ '^[A-Z]{2}$'
            AND phone_country_name IS NOT NULL
            AND length(btrim(phone_country_name)) > 0
            AND phone_calling_code IS NOT NULL
            AND phone_calling_code ~ '^\+[1-9][0-9]{0,2}$'
            AND phone_number IS NOT NULL
            AND left(phone_number, length(phone_calling_code)) = phone_calling_code
        )
    );

COMMIT;
