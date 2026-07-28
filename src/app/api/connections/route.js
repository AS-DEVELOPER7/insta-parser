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

    let query = supabase
      .from('connections')
      .select('*')
      .eq('user_id', user.id);

    if (type !== 'all') {
      query = query.eq('connection_type', type);
    }

    const { data: connections, error } = await query.order('connected_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Categorize connections
    const list = connections || [];
    const followers = list.filter((c) => c.connection_type === 'follower');
    const following = list.filter((c) => c.connection_type === 'following');
    const closeFriends = list.filter((c) => c.connection_type === 'close_friend');
    const blocked = list.filter((c) => c.connection_type === 'blocked');
    const requests = list.filter((c) => c.connection_type === 'request');

    return NextResponse.json({
      connections: list,
      counts: {
        followers: followers.length,
        following: following.length,
        closeFriends: closeFriends.length,
        blocked: blocked.length,
        requests: requests.length,
        total: list.length,
      },
    });
  } catch (err) {
    console.error('Connections API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
