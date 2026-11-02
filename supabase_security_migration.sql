-- =======================================================================
-- SAFE LIVE DATABASE SECURITY MIGRATION FOR INSTAVAULT (SUPABASE)
-- Run this script in your Supabase SQL Editor.
-- SAFE FOR LIVE PRODUCTION: Does NOT drop tables or delete any existing data!
-- =======================================================================

BEGIN;

-- 1. REVOKE DANGEROUS PERMISSIONS FROM ANON ROLE
-- Anon role should never have ALL (TRUNCATE, DROP, DELETE, etc.) on public tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Anon role only needs limited SELECT (governed strictly by RLS policies)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Authenticated role gets standard DML (no TRUNCATE or DDL)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. ENSURE ROW LEVEL SECURITY (RLS) IS ENABLED ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles or own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view public profiles or own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR is_private = false);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- 4. CONVERSATIONS POLICIES
DROP POLICY IF EXISTS "Users can access conversations" ON public.conversations;
CREATE POLICY "Users can access conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can access messages" ON public.messages;
CREATE POLICY "Users can access messages" ON public.messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
              AND conversations.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
              AND conversations.user_id = auth.uid()
        )
    );

-- 6. FAVORITE MESSAGES POLICIES (With Cross-Table Conversation Ownership Guard)
DROP POLICY IF EXISTS "Users can manage their favorite messages" ON public.favorite_messages;
CREATE POLICY "Users can manage their favorite messages" ON public.favorite_messages
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = favorite_messages.conversation_id
              AND conversations.user_id = auth.uid()
        )
    ) WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = favorite_messages.conversation_id
              AND conversations.user_id = auth.uid()
        )
    );

-- 7. CONNECTIONS POLICIES
DROP POLICY IF EXISTS "Users can access connections" ON public.connections;
CREATE POLICY "Users can access connections" ON public.connections
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. ACTIVITY LOGS POLICIES
DROP POLICY IF EXISTS "Users can access activity logs" ON public.activity_logs;
CREATE POLICY "Users can access activity logs" ON public.activity_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. POSTS & POST MEDIA POLICIES
DROP POLICY IF EXISTS "Users can access their posts" ON public.posts;
CREATE POLICY "Users can access their posts" ON public.posts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access post media" ON public.post_media;
CREATE POLICY "Users can access post media" ON public.post_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_media.post_id
              AND posts.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_media.post_id
              AND posts.user_id = auth.uid()
        )
    );

-- 10. STORIES POLICIES
DROP POLICY IF EXISTS "Users can access their stories" ON public.stories;
CREATE POLICY "Users can access their stories" ON public.stories
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. PERFORMANCE & DoS-RESISTANT INDEXES
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_participant ON public.conversations(user_id, participant_name);

CREATE INDEX IF NOT EXISTS idx_messages_conv_sent ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_media_lookup ON public.messages(conversation_id, media_type) WHERE media_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fav_messages_user_created ON public.favorite_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fav_messages_conv ON public.favorite_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_fav_messages_tag ON public.favorite_messages(user_id, tag);

CREATE INDEX IF NOT EXISTS idx_posts_user_taken ON public.posts(user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_taken ON public.stories(user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_connections_user_type ON public.connections(user_id, connection_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id, created_at DESC);

COMMIT;

