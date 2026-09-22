-- ============================================================================
-- CAMPUS CLASH 2D: WEBNEXUS EDITION — SUPABASE DATABASE SCHEMA
-- Execute this entire script in Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. LEADERBOARD TABLE (High Scores & Match Victories)
CREATE TABLE IF NOT EXISTS public.campus_clash_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT NOT NULL DEFAULT 'SRM Brawler',
    fighter_id TEXT NOT NULL,
    fighter_name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    damage_dealt INTEGER NOT NULL DEFAULT 0,
    max_combo INTEGER NOT NULL DEFAULT 0,
    rounds_won INTEGER NOT NULL DEFAULT 0,
    arena_id TEXT DEFAULT 'techpark',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for instant leaderboard score sorting
CREATE INDEX IF NOT EXISTS idx_campus_clash_leaderboard_score 
ON public.campus_clash_leaderboard (score DESC, created_at DESC);

-- 2. MATCH TELEMETRY TABLE (Analytics & Combat Stats)
CREATE TABLE IF NOT EXISTS public.campus_clash_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL DEFAULT 'pvp',
    winner TEXT NOT NULL,
    loser TEXT NOT NULL,
    p1_fighter TEXT NOT NULL,
    p2_fighter TEXT NOT NULL,
    p1_damage INTEGER DEFAULT 0,
    p2_damage INTEGER DEFAULT 0,
    max_combo INTEGER DEFAULT 0,
    arena_id TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PLAYER PROFILES TABLE (Stats & ELO tracking)
CREATE TABLE IF NOT EXISTS public.campus_clash_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    total_matches INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    favorite_fighter TEXT DEFAULT 'topper',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables anonymous players to read and submit scores from browser client
-- ============================================================================

ALTER TABLE public.campus_clash_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_clash_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_clash_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public anon) to read leaderboard
CREATE POLICY "Public can view leaderboard" 
ON public.campus_clash_leaderboard 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Allow anyone (public anon) to insert their match scores
CREATE POLICY "Public can insert scores" 
ON public.campus_clash_leaderboard 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Allow anyone (public anon) to log match telemetry
CREATE POLICY "Public can log matches" 
ON public.campus_clash_matches 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Public can view match history" 
ON public.campus_clash_matches 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Allow public to view and upsert profiles
CREATE POLICY "Public can view profiles" 
ON public.campus_clash_profiles 
FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Public can update profiles" 
ON public.campus_clash_profiles 
FOR ALL 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- ============================================================================
-- INITIAL SEED DATA (SRM Legends Roster Scores)
-- ============================================================================
INSERT INTO public.campus_clash_leaderboard (player_name, fighter_id, fighter_name, score, damage_dealt, max_combo, rounds_won, arena_id)
VALUES 
  ('Aarav Pro', 'topper', 'Aarav (Topper)', 4520, 480, 14, 2, 'techpark'),
  ('Kabir Backbench', 'backbencher', 'Kabir (Backbencher)', 3980, 420, 11, 2, 'vendharsquare'),
  ('Priya Dev', 'placementWarrior', 'Priya (Placement)', 3750, 410, 12, 2, 'cyberfortress'),
  ('Cypher Root', 'cypher', 'Cypher (Hacker)', 3400, 390, 9, 2, 'cloudcitadel'),
  ('Arjun Striker', 'sportsStar', 'Arjun (Sports)', 3100, 350, 8, 2, 'tpganesan')
ON CONFLICT DO NOTHING;
