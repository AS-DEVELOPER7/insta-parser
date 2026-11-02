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

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch counts of starred messages per conversation for this user
    const { data: favCounts } = await supabase
      .from('favorite_messages')
      .select('conversation_id')
      .eq('user_id', user.id);

    const starredCountsByConv = {};
    (favCounts || []).forEach((f) => {
      if (f.conversation_id) {
        starredCountsByConv[f.conversation_id] = (starredCountsByConv[f.conversation_id] || 0) + 1;
      }
    });

    const enrichedConversations = (conversations || []).map((c) => ({
      ...c,
      starred_count: starredCountsByConv[c.id] || 0,
    }));

    return NextResponse.json({ conversations: enrichedConversations });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
