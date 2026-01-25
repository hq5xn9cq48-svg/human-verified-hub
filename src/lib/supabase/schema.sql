-- ============================================================================
-- HUMAN-VERIFIED HUB - DATABASE SCHEMA
-- Freemium Model with Lemon Squeezy Integration
-- 24-Hour Rolling Window for Usage Limits
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Subscription fields
  is_pro BOOLEAN DEFAULT FALSE,
  subscription_id TEXT,           -- Lemon Squeezy subscription ID
  customer_id TEXT,               -- Lemon Squeezy customer ID
  subscription_status TEXT,       -- active, cancelled, expired, past_due
  subscription_variant TEXT,      -- 'monthly' or 'yearly'
  
  -- Usage tracking for freemium limits (24-hour rolling window)
  daily_usage_count INTEGER DEFAULT 0,
  last_usage_timestamp TIMESTAMP WITH TIME ZONE,  -- For 24-hour rolling window
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: Add last_usage_timestamp if not exists (for existing databases)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_usage_timestamp TIMESTAMP WITH TIME ZONE;

-- Migration: Add subscription_variant if not exists
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_variant TEXT;

-- ============================================================================
-- VERIFICATIONS TABLE (Analysis History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,                   -- Truncated content for reference
  content_type TEXT DEFAULT 'text', -- text, image, url
  result_score INTEGER,
  verdict TEXT,
  analysis TEXT,                  -- JSON analysis summary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CERTIFICATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_id UUID REFERENCES public.verifications(id) ON DELETE SET NULL,
  certificate_id TEXT UNIQUE NOT NULL,
  human_score INTEGER,
  content_excerpt TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_customer_id ON public.user_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_id ON public.user_profiles(subscription_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON public.verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_created_at ON public.verifications(created_at);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_id ON public.certificates(certificate_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role can update any profile (for webhooks)
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.user_profiles;
CREATE POLICY "Service role can manage profiles" ON public.user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Verifications policies
DROP POLICY IF EXISTS "Users can view own verifications" ON public.verifications;
CREATE POLICY "Users can view own verifications" ON public.verifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own verifications" ON public.verifications;
CREATE POLICY "Users can insert own verifications" ON public.verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Certificates policies
DROP POLICY IF EXISTS "Anyone can view certificates" ON public.certificates;
CREATE POLICY "Anyone can view certificates" ON public.certificates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own certificates" ON public.certificates;
CREATE POLICY "Users can insert own certificates" ON public.certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- FUNCTION: Check and update usage with 24-hour rolling window
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile public.user_profiles%ROWTYPE;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_can_use BOOLEAN := FALSE;
  v_remaining INTEGER := 0;
  v_reset_time TIMESTAMP WITH TIME ZONE;
  v_hours_since_last_use NUMERIC;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = p_user_id;
  
  -- If no profile, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (id, daily_usage_count, last_usage_timestamp)
    VALUES (p_user_id, 1, v_now)
    RETURNING * INTO v_profile;
    
    RETURN json_build_object(
      'canUse', TRUE,
      'isPro', FALSE,
      'remaining', 1,
      'usedToday', 1,
      'limit', 2,
      'message', '1 use remaining',
      'resetTime', (v_now + INTERVAL '24 hours')::TEXT
    );
  END IF;
  
  -- Pro users have unlimited access
  IF v_profile.is_pro THEN
    RETURN json_build_object(
      'canUse', TRUE,
      'isPro', TRUE,
      'remaining', -1,
      'usedToday', 0,
      'limit', -1,
      'message', 'Unlimited Pro access'
    );
  END IF;
  
  -- Calculate hours since last use
  IF v_profile.last_usage_timestamp IS NULL THEN
    v_hours_since_last_use := 999; -- Never used
  ELSE
    v_hours_since_last_use := EXTRACT(EPOCH FROM (v_now - v_profile.last_usage_timestamp)) / 3600;
  END IF;
  
  -- Reset counter if 24 hours have passed since last use
  IF v_hours_since_last_use >= 24 THEN
    v_profile.daily_usage_count := 0;
  END IF;
  
  -- Check if under limit (2 per 24 hours)
  IF v_profile.daily_usage_count < 2 THEN
    -- Increment counter and update timestamp
    UPDATE public.user_profiles 
    SET 
      daily_usage_count = v_profile.daily_usage_count + 1,
      last_usage_timestamp = v_now
    WHERE id = p_user_id;
    
    v_remaining := 2 - v_profile.daily_usage_count - 1;
    v_can_use := TRUE;
    v_reset_time := v_now + INTERVAL '24 hours';
  ELSE
    v_remaining := 0;
    v_can_use := FALSE;
    v_reset_time := v_profile.last_usage_timestamp + INTERVAL '24 hours';
  END IF;
  
  RETURN json_build_object(
    'canUse', v_can_use,
    'isPro', FALSE,
    'remaining', v_remaining,
    'usedToday', v_profile.daily_usage_count + (CASE WHEN v_can_use THEN 1 ELSE 0 END),
    'limit', 2,
    'message', CASE 
      WHEN v_can_use THEN v_remaining::TEXT || ' use(s) remaining'
      ELSE 'Daily limit reached. Upgrade to Pro for unlimited access.'
    END,
    'resetTime', v_reset_time::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get user usage status (without incrementing)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_usage_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile public.user_profiles%ROWTYPE;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_remaining INTEGER := 2;
  v_used INTEGER := 0;
  v_hours_since_last_use NUMERIC;
  v_reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'isPro', FALSE,
      'remaining', 2,
      'usedToday', 0,
      'limit', 2
    );
  END IF;
  
  IF v_profile.is_pro THEN
    RETURN json_build_object(
      'isPro', TRUE,
      'remaining', -1,
      'usedToday', 0,
      'limit', -1
    );
  END IF;
  
  -- Calculate hours since last use
  IF v_profile.last_usage_timestamp IS NOT NULL THEN
    v_hours_since_last_use := EXTRACT(EPOCH FROM (v_now - v_profile.last_usage_timestamp)) / 3600;
    
    IF v_hours_since_last_use < 24 THEN
      v_used := v_profile.daily_usage_count;
      v_remaining := GREATEST(0, 2 - v_used);
      v_reset_time := v_profile.last_usage_timestamp + INTERVAL '24 hours';
    END IF;
  END IF;
  
  RETURN json_build_object(
    'isPro', FALSE,
    'remaining', v_remaining,
    'usedToday', v_used,
    'limit', 2,
    'resetTime', v_reset_time::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
