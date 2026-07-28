-- ========================================================
-- INSTAVAULT CLEANED & OPTIMIZED SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to apply database cleanup
-- ========================================================

-- 1. CLEAN DROP UNUSED AND EXISTING TABLES
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.saved_posts CASCADE;

DROP TABLE IF EXISTS public.post_media CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    gender TEXT,
    dob TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CONVERSATIONS TABLE
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    participant_name TEXT NOT NULL,   -- decoded display name of recipient
    owner_username TEXT,              -- archive owner username (for isMe message detection)
    thread_folder_id TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_participant UNIQUE (user_id, participant_name)
);

-- 5. MESSAGES TABLE (Supports text, media, voice notes, audio, reels, shares)
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'voice_note')) DEFAULT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'media', 'share', 'reaction_action', 'system')) DEFAULT 'text',
    reactions JSONB DEFAULT '[]'::jsonb,
    share_url TEXT,
    share_text TEXT,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. CONNECTIONS TABLE (Followers, Following, Close Friends, Blocked, Follow Requests, Contacts)
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    connection_type TEXT CHECK (connection_type IN ('follower', 'following', 'close_friend', 'blocked', 'request', 'contact')) NOT NULL,
    target_username TEXT NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_connection UNIQUE (user_id, connection_type, target_username)
);

-- 7. ACTIVITY LOGS TABLE (Recent searches & link history)
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'search' or 'link'
    title TEXT,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. POSTS TABLE
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    caption TEXT,
    location TEXT,
    taken_at TIMESTAMP WITH TIME ZONE NOT NULL,
    export_format TEXT CHECK (export_format IN ('json', 'html')) DEFAULT 'json',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_post_time UNIQUE (user_id, taken_at)
);

-- 9. POST MEDIA TABLE
CREATE TABLE public.post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
    aspect_ratio DECIMAL(4, 3) DEFAULT 1.0,
    order_index INT DEFAULT 0,
    CONSTRAINT unique_post_media_order UNIQUE (post_id, order_index)
);

-- 10. STORIES TABLE
CREATE TABLE public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
    taken_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_story_time UNIQUE (user_id, taken_at)
);

-- 11. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 12. ROW LEVEL SECURITY POLICIES WITH 'WITH CHECK' CLAUSES
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can access conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can access messages" ON public.messages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can access connections" ON public.connections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can access activity logs" ON public.activity_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can access their posts" ON public.posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can access post media" ON public.post_media FOR ALL USING (
    EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid())
);
CREATE POLICY "Users can access their stories" ON public.stories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 13. GRANT PERMISSIONS TO AUTHENTICATED & ANON ROLES
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
