BEGIN;

-- KITCART DATABASE MIGRATION 001
-- PostgreSQL 18
-- Authentication and user management foundation

-- 1. USERS

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254),
    email_verified_at TIMESTAMPTZ,
    display_name VARCHAR(150),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_not_blank CHECK (
        email IS NULL OR LENGTH(TRIM(email)) > 0
    )
);

CREATE INDEX idx_users_email
ON users (LOWER(email));

-- Email alone is not used to merge social accounts.


-- 2. USER PROFILES

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50),
    phone_number VARCHAR(16),
    phone_verified_at TIMESTAMPTZ,
    date_of_birth DATE,
    gender VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT username_format CHECK (
        username IS NULL OR
        username ~ '^[A-Za-z][A-Za-z0-9]*$'
    ),

    CONSTRAINT phone_format CHECK (
        phone_number IS NULL OR
        phone_number ~ '^\+[1-9][0-9]{7,14}$'
    ),

    CONSTRAINT dob_valid CHECK (
        date_of_birth IS NULL OR
        date_of_birth >= DATE '1900-01-01'
    )
);

CREATE UNIQUE INDEX idx_username_unique
ON user_profiles (LOWER(username))
WHERE username IS NOT NULL;

CREATE UNIQUE INDEX idx_phone_unique
ON user_profiles (phone_number)
WHERE phone_number IS NOT NULL;


-- 3. OAUTH ACCOUNTS

CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    provider VARCHAR(30) NOT NULL,
    provider_account_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT provider_allowed CHECK (
        provider IN ('google', 'github', 'facebook')
    ),

    CONSTRAINT provider_account_unique UNIQUE (
        provider, provider_account_id
    ),

    CONSTRAINT one_provider_per_user UNIQUE (
        user_id, provider
    )
);

CREATE INDEX idx_oauth_user
ON oauth_accounts (user_id);


-- 4. PASSWORD CREDENTIALS

CREATE TABLE password_credentials (
    user_id UUID PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,

    password_hash TEXT NOT NULL,
    password_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT password_hash_valid CHECK (
        password_hash LIKE '$argon2id$%'
    )
);

-- The application will generate and verify Argon2id hashes.
-- Never store raw passwords.


-- 5. PENDING REGISTRATIONS

CREATE TABLE pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(50) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone_number VARCHAR(16) NOT NULL,
    password_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pending_username_format CHECK (
        username ~ '^[A-Za-z][A-Za-z0-9]*$'
    ),

    CONSTRAINT pending_phone_format CHECK (
        phone_number ~ '^\+[1-9][0-9]{7,14}$'
    ),

    CONSTRAINT pending_password_hash CHECK (
        password_hash LIKE '$argon2id$%'
    ),

    CONSTRAINT pending_expiry CHECK (
        expires_at > created_at
    )
);

CREATE INDEX idx_pending_expiry
ON pending_registrations (expires_at);

CREATE INDEX idx_pending_email
ON pending_registrations (LOWER(email));


-- 6. VERIFICATION CHALLENGES

CREATE TABLE verification_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id) ON DELETE CASCADE,

    pending_registration_id UUID
        REFERENCES pending_registrations(id) ON DELETE CASCADE,

    channel VARCHAR(10) NOT NULL,
    destination VARCHAR(254) NOT NULL,
    purpose VARCHAR(30) NOT NULL,

    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,

    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    resend_available_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT channel_allowed CHECK (
        channel IN ('email', 'phone')
    ),

    CONSTRAINT purpose_allowed CHECK (
        purpose IN (
            'signup',
            'email_verification',
            'phone_verification',
            'password_reset'
        )
    ),

    CONSTRAINT attempts_valid CHECK (
        attempts >= 0 AND
        max_attempts > 0 AND
        attempts <= max_attempts
    ),

    CONSTRAINT challenge_expiry CHECK (
        expires_at > created_at
    ),

    CONSTRAINT challenge_subject CHECK (
        user_id IS NOT NULL OR
        pending_registration_id IS NOT NULL
    )
);

CREATE INDEX idx_challenge_expiry
ON verification_challenges (expires_at);

CREATE INDEX idx_challenge_destination
ON verification_challenges (channel, destination);


-- 7. LOGIN EVENTS

CREATE TABLE login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    provider VARCHAR(30) NOT NULL,
    event_type VARCHAR(30) NOT NULL,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT login_provider_allowed CHECK (
        provider IN (
            'google',
            'github',
            'facebook',
            'credentials'
        )
    ),

    CONSTRAINT login_event_allowed CHECK (
        event_type IN (
            'login_success',
            'login_failed',
            'logout',
            'account_locked'
        )
    )
);

CREATE INDEX idx_login_user
ON login_events (user_id, created_at DESC);

CREATE INDEX idx_login_created
ON login_events (created_at);


COMMIT;
