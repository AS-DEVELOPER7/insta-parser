import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(Math.max(parseInt(limitParam || '30', 10), 1), 100);
    const offset = Math.max(parseInt(offsetParam || '0', 10), 0);

    // Get user's conversation IDs
    const { data: userConvs, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id);

    if (convError) {
      console.error('Error fetching user conversations:', convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    const convIds = (userConvs || []).map((c) => c.id);

    if (convIds.length === 0) {
      return NextResponse.json({
        media: [],
        counts: { all: 0, photos: 0, videos: 0, reels: 0, links: 0 },
        total: 0,
        hasMore: false,
        nextOffset: 0,
      });
    }

    // 1. Fetch total counts across categories
    const { count: totalAll } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .or('media_url.not.is.null,share_url.not.is.null');

    const { count: totalPhotos } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .or('media_type.eq.image,media_url.ilike.%.jpg,media_url.ilike.%.png,media_url.ilike.%.webp,media_url.ilike.%.jpeg');

    const { count: totalVideos } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .or('media_type.eq.video,media_url.ilike.%.mp4,media_url.ilike.%.mov,media_url.ilike.%.webm')
      .not('media_type', 'eq', 'audio')
      .not('media_type', 'eq', 'voice_note')
      .not('media_url', 'ilike', '%/audio/%');

    const { count: totalAudio } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .or('media_type.eq.audio,media_type.eq.voice_note,media_url.ilike.%/audio/%,media_url.ilike.%.m4a,media_url.ilike.%.mp3,media_url.ilike.%.ogg,media_url.ilike.%.wav');

    const { count: totalReels } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .ilike('share_url', '%/reel/%');

    const { count: totalLinks } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .not('share_url', 'is', null)
      .is('media_url', null);

    // 2. Build filtered paginated query for requested tab
    let query = supabase
      .from('messages')
      .select('id, conversation_id, sender_name, content, message_type, media_type, media_url, share_url, share_text, sent_at')
      .in('conversation_id', convIds)
      .or('media_url.not.is.null,share_url.not.is.null');

    if (type === 'image') {
      query = query.or('media_type.eq.image,media_url.ilike.%.jpg,media_url.ilike.%.png,media_url.ilike.%.webp,media_url.ilike.%.jpeg');
    } else if (type === 'video') {
      query = query
        .or('media_type.eq.video,media_url.ilike.%.mp4,media_url.ilike.%.mov,media_url.ilike.%.webm')
        .not('media_type', 'eq', 'audio')
        .not('media_type', 'eq', 'voice_note')
        .not('media_url', 'ilike', '%/audio/%');
    } else if (type === 'audio') {
      query = query.or('media_type.eq.audio,media_type.eq.voice_note,media_url.ilike.%/audio/%,media_url.ilike.%.m4a,media_url.ilike.%.mp3,media_url.ilike.%.ogg,media_url.ilike.%.wav');
    } else if (type === 'reel') {
      query = query.ilike('share_url', '%/reel/%');
    } else if (type === 'link') {
      query = query.not('share_url', 'is', null).is('media_url', null);
    }

    const { data: mediaItems, error: mediaError } = await query
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (mediaError) {
      console.error('Error fetching media items:', mediaError);
      return NextResponse.json({ error: mediaError.message }, { status: 500 });
    }

    const fetchedItems = mediaItems || [];
    let currentCategoryTotal = totalAll || 0;
    if (type === 'image') currentCategoryTotal = totalPhotos || 0;
    else if (type === 'video') currentCategoryTotal = totalVideos || 0;
    else if (type === 'audio') currentCategoryTotal = totalAudio || 0;
    else if (type === 'reel') currentCategoryTotal = totalReels || 0;
    else if (type === 'link') currentCategoryTotal = totalLinks || 0;

    const hasMore = offset + fetchedItems.length < currentCategoryTotal;

    return NextResponse.json({
      media: fetchedItems,
      counts: {
        all: totalAll || 0,
        photos: totalPhotos || 0,
        videos: totalVideos || 0,
        audio: totalAudio || 0,
        reels: totalReels || 0,
        links: totalLinks || 0,
      },
      total: currentCategoryTotal,
      hasMore,
      nextOffset: offset + fetchedItems.length,
    });
  } catch (err) {
    console.error('Media API exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
