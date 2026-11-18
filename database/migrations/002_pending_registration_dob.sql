BEGIN;

ALTER TABLE public.pending_registrations
    ADD COLUMN date_of_birth DATE,
    ADD CONSTRAINT pending_registrations_dob_valid
        CHECK (
            isfinite(date_of_birth)
            AND date_of_birth >= DATE '1900-01-01'
        );

COMMIT;
