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

    // Base query for media messages
    let query = supabase
      .from('messages')
      .select('id, conversation_id, sender_name, content, message_type, media_type, media_url, share_url, share_text, sent_at')
      .eq('conversation_id', conversationId)
      .or('media_url.not.is.null,share_url.not.is.null,message_type.eq.media,message_type.eq.share');

    // Total count query for media badge
    const { count: totalCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .or('media_url.not.is.null,share_url.not.is.null,message_type.eq.media,message_type.eq.share');

    if (countError) {
      console.error('Error counting media messages:', countError);
    }

    // Apply type filter if specific tab selected
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

    // Fetch page of 20 media items
    const { data: mediaMessages, error } = await query
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching media chunk:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fetchedItems = mediaMessages || [];
    const hasMore = (offset + fetchedItems.length) < (totalCount || 0);

    return NextResponse.json({
      mediaMessages: fetchedItems,
      totalCount: totalCount || 0,
      hasMore,
      nextOffset: offset + fetchedItems.length,
    });
  } catch (err) {
    console.error('Media API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
