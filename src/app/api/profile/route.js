import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user profile from Supabase database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // 2. Extract signup metadata fallback if profile fields are empty
    const userMeta = user.user_metadata || {};
    const finalUsername = profile?.username || userMeta.username || (user.email ? user.email.split('@')[0] : 'user');
    const finalFullName = profile?.full_name || userMeta.full_name || finalUsername;
    const finalBio = profile?.bio || '';
    const finalEmail = profile?.email || user.email || '';
    const finalPhone = profile?.phone || '';
    const finalDob = profile?.dob || '';
    const finalGender = profile?.gender || '';
    const finalWebsite = profile?.website || '';
    const finalIsPrivate = profile?.is_private ?? true;
    const avatarUrl = profile?.avatar_url || '';

    // 3. Fetch user posts with post_media from Supabase database
    const { data: dbPosts } = await supabase
      .from('posts')
      .select('*, post_media(*)')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false });

    console.log('--- DB POSTS DEBUG --- count:', dbPosts?.length);
    dbPosts?.forEach((p) => {
      console.log(`ID: ${p.id} | taken_at: ${p.taken_at} | caption: "${p.caption?.slice(0, 25)}" | media_count: ${p.post_media?.length} | first_url: ${p.post_media?.[0]?.media_url}`);
    });

    // Deduplicate posts by matching timestamp window (within 60s) or exact non-empty caption
    const deduplicatedPosts = [];

    (dbPosts || []).forEach((post) => {
      const postTime = new Date(post.taken_at).getTime();
      const cleanCaption = post.caption?.trim() || "";

      // Check if this post is a duplicate of an already accepted post
      const existingIdx = deduplicatedPosts.findIndex((existing) => {
        const existingTime = new Date(existing.taken_at).getTime();
        const existingCaption = existing.caption?.trim() || "";

        // Condition A: Timestamps match within 60 seconds
        const isTimeMatch = Math.abs(postTime - existingTime) < 60000;

        // Condition B: Non-empty captions match exactly
        const isCaptionMatch =
          cleanCaption.length > 5 && cleanCaption === existingCaption;

        return isTimeMatch || isCaptionMatch;
      });

      if (existingIdx === -1) {
        deduplicatedPosts.push(post);
      } else {
        const existing = deduplicatedPosts[existingIdx];
        const postMediaCount = post.post_media?.length || 0;
        const existingMediaCount = existing.post_media?.length || 0;

        // Keep the post version that has MORE media items (carousel), or merge captions
        if (postMediaCount > existingMediaCount) {
          if (!post.caption && existing.caption) post.caption = existing.caption;
          deduplicatedPosts[existingIdx] = post;
        } else {
          if (!existing.caption && post.caption) existing.caption = post.caption;
        }
      }
    });

    const posts = deduplicatedPosts;

    // 4. Fetch user stories from Supabase database
    const { data: dbStories } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false });

    // 5. Fetch connections counts from Supabase database
    const { count: followersCount } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('connection_type', 'follower');

    const { count: followingCount } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('connection_type', 'following');

    const stories = dbStories || [];

    const mergedProfile = {
      ...profile,
      username: finalUsername,
      full_name: finalFullName,
      bio: finalBio,
      email: finalEmail,
      phone: finalPhone,
      dob: finalDob,
      gender: finalGender,
      website: finalWebsite,
      is_private: finalIsPrivate,
      avatar_url: avatarUrl,
    };

    return NextResponse.json({
      profile: mergedProfile,
      posts,
      stories,
      stats: {
        postsCount: posts.length,
        storiesCount: stories.length,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      },
    });
  } catch (err) {
    console.error('Profile API exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
