import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PAGINATION_LIMITS } from '@/constants/config';

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

    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const aroundId = searchParams.get('aroundId');
    const beforeDate = searchParams.get('beforeDate');
    const afterDate = searchParams.get('afterDate');

    const limit = Math.min(
      Math.max(parseInt(limitParam || String(PAGINATION_LIMITS.MESSAGES_DEFAULT), 10), 1),
      PAGINATION_LIMITS.MESSAGES_MAX
    );
    const offset = Math.max(parseInt(offsetParam || '0', 10), 0);

    // Get total message count for this conversation
    const { count: totalCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (countError) {
      console.error('Error counting messages:', countError);
    }

    // 1. Fetching older messages before/at a specific timestamp
    if (beforeDate) {
      const { data: chunk, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lte('sent_at', beforeDate)
        .order('sent_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 5);

      if (error) {
        console.error('Error fetching older messages:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const messages = (chunk || []).reverse();

      // Check if there are any remaining messages older than the earliest returned message
      let hasMoreOlder = false;
      if (messages.length > 0) {
        const earliestSentAt = messages[0].sent_at;
        const { count: olderCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)
          .lt('sent_at', earliestSentAt);
        hasMoreOlder = (olderCount || 0) > 0;
      }

      return NextResponse.json({
        messages,
        totalCount: totalCount || 0,
        hasMoreOlder,
      });
    }

    // 2. Fetching newer messages after/at a specific timestamp
    if (afterDate) {
      const { data: chunk, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .gte('sent_at', afterDate)
        .order('sent_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit + 5);

      if (error) {
        console.error('Error fetching newer messages:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const messages = chunk || [];

      // Check if there are any remaining messages newer than the latest returned message
      let hasMoreNewer = false;
      if (messages.length > 0) {
        const latestSentAt = messages[messages.length - 1].sent_at;
        const { count: newerCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)
          .gt('sent_at', latestSentAt);
        hasMoreNewer = (newerCount || 0) > 0;
      }

      return NextResponse.json({
        messages,
        totalCount: totalCount || 0,
        hasMoreNewer,
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
          .order('id', { ascending: false })
          .limit(halfWindow + 5);

        // Fetch newer messages at/after targetMsg
        const { data: newerChunk } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .gte('sent_at', targetMsg.sent_at)
          .order('sent_at', { ascending: true })
          .order('id', { ascending: true })
          .limit(halfWindow + 5);

        // Combine and deduplicate
        const seenIds = new Set();
        const combined = [];

        const rawList = [
          ...(olderChunk || []).reverse(),
          ...(newerChunk || []),
        ];

        for (const m of rawList) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            combined.push(m);
          }
        }

        combined.sort((a, b) => {
          const tA = new Date(a.sent_at).getTime();
          const tB = new Date(b.sent_at).getTime();
          if (tA !== tB) return tA - tB;
          return (a.id || '').localeCompare(b.id || '');
        });

        // Determine if there are further older/newer messages outside this window
        let hasMoreOlder = false;
        let hasMoreNewer = false;

        if (combined.length > 0) {
          const firstMsgSentAt = combined[0].sent_at;
          const lastMsgSentAt = combined[combined.length - 1].sent_at;

          const { count: olderCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .lt('sent_at', firstMsgSentAt);

          const { count: newerCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .gt('sent_at', lastMsgSentAt);

          hasMoreOlder = (olderCount || 0) > 0;
          hasMoreNewer = (newerCount || 0) > 0;
        }

        return NextResponse.json({
          messages: combined,
          totalCount: totalCount || combined.length,
          hasMoreOlder,
          hasMoreNewer,
          targetId: aroundId,
        });
      }
    }

    // 4. Default initial fetch: get most recent messages
    const { data: chunk, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .order('id', { ascending: false })
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
