-- ==============================================================================
-- 5.55 CLIENT PLATFORM - SUPABASE SCHEMA MIGRATION
-- Project: thmpaozerfhoykqxwrlz
-- Date: 2026-11-11
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM & DOMAIN TYPES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status') THEN
        CREATE TYPE license_status AS ENUM ('active', 'expired', 'revoked', 'suspended');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_tier') THEN
        CREATE TYPE license_tier AS ENUM ('lifetime', 'subscription', 'trial');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_type') THEN
        CREATE TYPE platform_type AS ENUM ('fabric', 'native', 'both');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_category') THEN
        CREATE TYPE client_category AS ENUM ('java', 'cpp', 'launcher');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'release_channel') THEN
        CREATE TYPE release_channel AS ENUM ('stable', 'beta', 'dev');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_status') THEN
        CREATE TYPE webhook_status AS ENUM ('pending', 'processed', 'failed', 'ignored');
    END IF;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'user',
    discord_id TEXT,
    banned_at TIMESTAMPTZ DEFAULT NULL,
    ban_reason TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND banned_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    platform platform_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- 5. LICENSES TABLE
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    license_key TEXT UNIQUE NOT NULL,
    status license_status NOT NULL DEFAULT 'active',
    license_type license_tier NOT NULL DEFAULT 'lifetime',
    expires_at TIMESTAMPTZ DEFAULT NULL,
    max_devices INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON public.licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_product_id ON public.licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status);

-- 6. DEVICES TABLE (HWID Tracking)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hwid TEXT NOT NULL,
    device_name TEXT,
    ip_address TEXT,
    client_type client_category NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_license_hwid UNIQUE (license_id, hwid)
);

CREATE INDEX IF NOT EXISTS idx_devices_license_id ON public.devices(license_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_hwid ON public.devices(hwid);

-- 7. CLIENT RELEASES TABLE
CREATE TABLE IF NOT EXISTS public.client_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    version TEXT NOT NULL,
    channel release_channel NOT NULL DEFAULT 'stable',
    min_mc_version TEXT,
    max_mc_version TEXT,
    file_type TEXT NOT NULL CHECK (file_type IN ('jar', 'exe', 'dll', 'zip')),
    storage_path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    signature TEXT NOT NULL, -- Ed25519 signature
    changelog TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_product_release UNIQUE (product_id, version, file_type)
);

CREATE INDEX IF NOT EXISTS idx_releases_product ON public.client_releases(product_id, is_active);

-- 8. DOWNLOAD TOKENS TABLE (Temporary Single-Use Tokens)
CREATE TABLE IF NOT EXISTS public.download_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    release_id UUID NOT NULL REFERENCES public.client_releases(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON public.download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires ON public.download_tokens(expires_at);

-- 9. WEBHOOK EVENTS TABLE (SellAuth Idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'sellauth',
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status webhook_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 11. SESSIONS TABLE (Runtime Heartbeats)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    client_type TEXT NOT NULL,
    mc_version TEXT,
    ip_address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions(is_active, expires_at);

-- ==============================================================================
-- TRIGGERS & FUNCTIONS
-- ==============================================================================

-- 1. Auto-create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        username,
        display_name,
        avatar_url,
        role
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'user'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_licenses_updated_at ON public.licenses;
CREATE TRIGGER set_licenses_updated_at
    BEFORE UPDATE ON public.licenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own non-sensitive profile fields" ON public.profiles;
CREATE POLICY "Users can update own non-sensitive profile fields"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (
        (auth.uid() = id AND role = 'user' AND banned_at IS NULL)
        OR public.is_admin()
    );

-- PRODUCTS POLICIES
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify products" ON public.products;
CREATE POLICY "Only admins can modify products"
    ON public.products FOR ALL
    USING (public.is_admin());

-- LICENSES POLICIES
DROP POLICY IF EXISTS "Users can view own licenses" ON public.licenses;
CREATE POLICY "Users can view own licenses"
    ON public.licenses FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify licenses" ON public.licenses;
CREATE POLICY "Only admins can modify licenses"
    ON public.licenses FOR ALL
    USING (public.is_admin());

-- DEVICES POLICIES
DROP POLICY IF EXISTS "Users can view own registered devices" ON public.devices;
CREATE POLICY "Users can view own registered devices"
    ON public.devices FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own devices (HWID unbind)" ON public.devices;
CREATE POLICY "Users can delete own devices (HWID unbind)"
    ON public.devices FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify devices directly" ON public.devices;
CREATE POLICY "Only admins can modify devices directly"
    ON public.devices FOR INSERT
    WITH CHECK (public.is_admin());

-- CLIENT RELEASES POLICIES
DROP POLICY IF EXISTS "Authenticated users can view active releases" ON public.client_releases;
CREATE POLICY "Authenticated users can view active releases"
    ON public.client_releases FOR SELECT
    USING ((auth.role() = 'authenticated' AND is_active = TRUE) OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can manage releases" ON public.client_releases;
CREATE POLICY "Only admins can manage releases"
    ON public.client_releases FOR ALL
    USING (public.is_admin());

-- DOWNLOAD TOKENS POLICIES
DROP POLICY IF EXISTS "Users can view own download tokens" ON public.download_tokens;
CREATE POLICY "Users can view own download tokens"
    ON public.download_tokens FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- WEBHOOK EVENTS POLICIES (Strict: Only service role & admins)
DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.webhook_events;
CREATE POLICY "Admins can view webhook logs"
    ON public.webhook_events FOR SELECT
    USING (public.is_admin());

-- AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
    ON public.audit_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- SESSIONS POLICIES
DROP POLICY IF EXISTS "Users can view own active client sessions" ON public.sessions;
CREATE POLICY "Users can view own active client sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- SEED DEFAULT PRODUCTS
-- ==============================================================================

INSERT INTO public.products (slug, name, description, price_usd, platform, is_active)
VALUES
    (
        'java-client',
        '5.55 Java Client',
        'Advanced Fabric 1.21.x Ghost Client featuring seamless combat automation, undetectable bypass mechanisms, and zero performance impact.',
        19.99,
        'fabric',
        TRUE
    ),
    (
        'cpp-client',
        '5.55 C++ Client',
        'High-performance native C++ injector and internal hook DLL offering ultra-low latency memory manipulation and advanced stealth capabilities.',
        29.99,
        'native',
        TRUE
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_usd = EXCLUDED.price_usd,
    platform = EXCLUDED.platform,
    is_active = EXCLUDED.is_active;

-- ==============================================================================
-- SECURE STORED PROCEDURES (RPCs)
-- ==============================================================================

-- 1. Redeem Unassigned License Key
CREATE OR REPLACE FUNCTION public.redeem_license_key(p_license_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_license RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Find the license
    SELECT * INTO v_license
    FROM public.licenses
    WHERE license_key = UPPER(TRIM(p_license_key));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid license key');
    END IF;

    IF v_license.status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This license has been revoked');
    END IF;

    IF v_license.user_id IS NOT NULL AND v_license.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'License is already registered to another account');
    END IF;

    IF v_license.user_id = v_user_id THEN
        RETURN jsonb_build_object('success', true, 'message', 'License is already active on your account');
    END IF;

    -- Bind license to current user
    UPDATE public.licenses
    SET user_id = v_user_id,
        status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_license.id;

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'LICENSE_REDEEMED', 'license', v_license.id::text, jsonb_build_object('license_key', v_license.license_key));

    RETURN jsonb_build_object('success', true, 'message', 'License successfully activated!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
