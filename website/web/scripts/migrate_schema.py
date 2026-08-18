#!/usr/bin/env python3
"""Execute AlphaCouncil schema migration against Supabase."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client

# Load env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
env = {}
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k] = v

url = env["NEXT_PUBLIC_SUPABASE_URL"]
key = env["SUPABASE_SERVICE_ROLE_KEY"]
su = create_client(url, key)

statements = [
    # research_summaries
    """CREATE TABLE IF NOT EXISTS public.research_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticker TEXT NOT NULL,
        company TEXT NOT NULL,
        verdict TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        bull_points JSONB DEFAULT '[]'::jsonb,
        bear_points JSONB DEFAULT '[]'::jsonb,
        committee_summary TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    "ALTER TABLE public.research_summaries ENABLE ROW LEVEL SECURITY",
    """DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone can read research summaries' AND tablename = 'research_summaries') THEN
      CREATE POLICY "anyone can read research summaries" ON public.research_summaries FOR SELECT USING (true);
    END IF;
    END $$""",

    # content_posts
    """CREATE TABLE IF NOT EXISTS public.content_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticker TEXT,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    "ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY",
    """DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone can read content posts' AND tablename = 'content_posts') THEN
      CREATE POLICY "anyone can read content posts" ON public.content_posts FOR SELECT USING (true);
    END IF;
    END $$""",

    # beta_waitlist
    """CREATE TABLE IF NOT EXISTS public.beta_waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        source TEXT DEFAULT 'homepage',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    "ALTER TABLE public.beta_waitlist ENABLE ROW LEVEL SECURITY",
    """DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone can insert beta signups' AND tablename = 'beta_waitlist') THEN
      CREATE POLICY "anyone can insert beta signups" ON public.beta_waitlist FOR INSERT WITH CHECK (true);
    END IF;
    END $$""",

    # feedbacks
    """CREATE TABLE IF NOT EXISTS public.feedbacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    "ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY",
    """DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone can insert feedback' AND tablename = 'feedbacks') THEN
      CREATE POLICY "anyone can insert feedback" ON public.feedbacks FOR INSERT WITH CHECK (true);
      CREATE POLICY "anyone can read feedback" ON public.feedbacks FOR SELECT USING (true);
    END IF;
    END $$""",
]

# Execute via rpc (pg_exec) 
for idx, stmt in enumerate(statements):
    try:
        # Use the REST API to execute raw SQL via the Supabase client
        su.rpc('pg_exec', {'query': stmt}).execute()
        print(f"✓ {idx+1}/{len(statements)}")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            print(f"◦ {idx+1}/{len(statements)} (already exists)")
        else:
            print(f"✗ {idx+1}/{len(statements)}: {e}")

print("\nMigration complete.")
