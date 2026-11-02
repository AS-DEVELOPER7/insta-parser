import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const type = searchParams.get('type') || 'all';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId parameter is required' }, { status: 400 });
    }

    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10), 1), 100);
    const offset = Math.max(parseInt(offsetParam || '0', 10), 0);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Defense-in-depth IDOR check: Verify conversation ownership
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // 1. Fetch exact SQL COUNT queries for all category tabs (no 1000 row truncation)
    const { count: totalAll } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .or('media_url.not.is.null,share_url.not.is.null');

    const { count: totalImages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .not('media_url', 'is', null)
      .or('media_type.eq.image,media_url.ilike.%.jpg,media_url.ilike.%.png,media_url.ilike.%.webp,media_url.ilike.%.jpeg')
      .not('media_type', 'eq', 'video')
      .not('media_type', 'eq', 'audio')
      .not('media_type', 'eq', 'voice_note')
      .not('media_url', 'ilike', '%.mp4')
      .not('media_url', 'ilike', '%.mov')
      .not('media_url', 'ilike', '%/audio/%');

    const { count: totalVideos } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .not('media_url', 'is', null)
      .or('media_type.eq.video,media_url.ilike.%.mp4,media_url.ilike.%.mov,media_url.ilike.%.webm')
      .not('media_type', 'eq', 'audio')
      .not('media_type', 'eq', 'voice_note')
      .not('media_url', 'ilike', '%/audio/%');

    const { count: totalAudio } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .or('media_type.eq.audio,media_type.eq.voice_note,media_url.ilike.%/audio/%,media_url.ilike.%.m4a,media_url.ilike.%.mp3,media_url.ilike.%.ogg,media_url.ilike.%.wav');

    const { count: totalReels } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .or('share_url.ilike.%/reel/%,media_url.ilike.%/reel/%');

    const { count: totalLinks } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .not('share_url', 'is', null)
      .is('media_url', null)
      .not('share_url', 'ilike', '%/reel/%');

    const counts = {
      all: totalAll || 0,
      image: totalImages || 0,
      video: totalVideos || 0,
      audio: totalAudio || 0,
      reel: totalReels || 0,
      link: totalLinks || 0,
    };

    // 2. Build filtered paginated query for requested tab
    let query = supabase
      .from('messages')
      .select('id, conversation_id, sender_name, content, message_type, media_type, media_url, share_url, share_text, sent_at')
      .eq('conversation_id', conversationId);

    if (type === 'image') {
      query = query
        .not('media_url', 'is', null)
        .or('media_type.eq.image,media_url.ilike.%.jpg,media_url.ilike.%.png,media_url.ilike.%.webp,media_url.ilike.%.jpeg')
        .not('media_type', 'eq', 'video')
        .not('media_type', 'eq', 'audio')
        .not('media_type', 'eq', 'voice_note')
        .not('media_url', 'ilike', '%.mp4')
        .not('media_url', 'ilike', '%.mov')
        .not('media_url', 'ilike', '%/audio/%');
    } else if (type === 'video') {
      query = query
        .not('media_url', 'is', null)
        .or('media_type.eq.video,media_url.ilike.%.mp4,media_url.ilike.%.mov,media_url.ilike.%.webm')
        .not('media_type', 'eq', 'audio')
        .not('media_type', 'eq', 'voice_note')
        .not('media_url', 'ilike', '%/audio/%');
    } else if (type === 'audio') {
      query = query.or('media_type.eq.audio,media_type.eq.voice_note,media_url.ilike.%/audio/%,media_url.ilike.%.m4a,media_url.ilike.%.mp3,media_url.ilike.%.ogg,media_url.ilike.%.wav');
    } else if (type === 'reel') {
      query = query.or('share_url.ilike.%/reel/%,media_url.ilike.%/reel/%');
    } else if (type === 'link') {
      query = query.not('share_url', 'is', null).is('media_url', null).not('share_url', 'ilike', '%/reel/%');
    } else {
      query = query.or('media_url.not.is.null,share_url.not.is.null');
    }

    // Fetch page of 20 media items
    const { data: mediaMessages, error } = await query
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching media chunk:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fetchedItems = mediaMessages || [];
    let currentCategoryTotal = totalAll || 0;
    if (type === 'image') currentCategoryTotal = totalImages || 0;
    else if (type === 'video') currentCategoryTotal = totalVideos || 0;
    else if (type === 'audio') currentCategoryTotal = totalAudio || 0;
    else if (type === 'reel') currentCategoryTotal = totalReels || 0;
    else if (type === 'link') currentCategoryTotal = totalLinks || 0;

    const hasMore = offset + fetchedItems.length < currentCategoryTotal;

    return NextResponse.json({
      mediaMessages: fetchedItems,
      totalCount: currentCategoryTotal,
      counts,
      hasMore,
      nextOffset: offset + fetchedItems.length,
    });
  } catch (err) {
    console.error('Media API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
