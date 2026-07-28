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

    let logs = [];

    // 1. Try fetching from activity_logs table
    const { data: dbLogs, error: tableErr } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!tableErr && dbLogs && dbLogs.length > 0) {
      logs = dbLogs;
    } else {
      // 2. Fallback to profiles.preferences.activity_logs
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.preferences?.activity_logs && Array.isArray(profile.preferences.activity_logs)) {
        logs = profile.preferences.activity_logs;
      }
    }

    const recentSearches = (logs || [])
      .filter((l) => l.type === 'search')
      .map((l) => ({
        query: l.title || l.value,
        time: l.createdAt || l.created_at
          ? new Date(l.createdAt || l.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
      }));

    const linkHistory = (logs || [])
      .filter((l) => l.type === 'link')
      .map((l) => ({
        url: l.value,
        title: l.title || l.value,
        time: l.createdAt || l.created_at
          ? new Date(l.createdAt || l.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
      }));

    return NextResponse.json({
      recentSearches,
      linkHistory,
    });
  } catch (err) {
    console.error('Activity log API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
