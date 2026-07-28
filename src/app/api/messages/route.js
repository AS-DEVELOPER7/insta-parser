import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId parameter is required' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const aroundId = searchParams.get('aroundId');
    const beforeDate = searchParams.get('beforeDate');
    const afterDate = searchParams.get('afterDate');

    const limit = Math.min(Math.max(parseInt(limitParam || '200', 10), 1), 500);
    const offset = Math.max(parseInt(offsetParam || '0', 10), 0);

    // Get total message count for this conversation
    const { count: totalCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (countError) {
      console.error('Error counting messages:', countError);
    }

    // 1. Fetching older messages before a specific timestamp
    if (beforeDate) {
      const { data: chunk, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('sent_at', beforeDate)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching older messages:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const messages = (chunk || []).reverse();
      return NextResponse.json({
        messages,
        totalCount: totalCount || 0,
        hasMoreOlder: chunk ? chunk.length === limit : false,
      });
    }

    // 2. Fetching newer messages after a specific timestamp
    if (afterDate) {
      const { data: chunk, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .gt('sent_at', afterDate)
        .order('sent_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching newer messages:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const messages = chunk || [];
      return NextResponse.json({
        messages,
        totalCount: totalCount || 0,
        hasMoreNewer: chunk ? chunk.length === limit : false,
      });
    }

    // 3. Fetching context window around a target search result message
    if (aroundId) {
      const { data: targetMsg, error: targetError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', aroundId)
        .single();

      if (!targetError && targetMsg) {
        const halfWindow = Math.floor(limit / 2);
        
        // Fetch older & current messages up to targetMsg
        const { data: olderChunk } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .lte('sent_at', targetMsg.sent_at)
          .order('sent_at', { ascending: false })
          .limit(halfWindow);

        // Fetch newer messages after targetMsg
        const { data: newerChunk } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .gt('sent_at', targetMsg.sent_at)
          .order('sent_at', { ascending: true })
          .limit(halfWindow);

        const combined = [
          ...(olderChunk || []).reverse(),
          ...(newerChunk || [])
        ];

        return NextResponse.json({
          messages: combined,
          totalCount: totalCount || combined.length,
          hasMoreOlder: olderChunk ? olderChunk.length === halfWindow : false,
          hasMoreNewer: newerChunk ? newerChunk.length === halfWindow : false,
          targetId: aroundId
        });
      }
    }

    // 4. Default initial fetch: get most recent messages
    const { data: chunk, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages chunk:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const messages = (chunk || []).reverse();
    const loadedCount = offset + messages.length;
    const hasMoreOlder = loadedCount < (totalCount || 0);

    return NextResponse.json({
      messages,
      totalCount: totalCount || 0,
      hasMoreOlder,
      hasMoreNewer: false,
      nextOffset: loadedCount,
    });
  } catch (err) {
    console.error('Messages API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
