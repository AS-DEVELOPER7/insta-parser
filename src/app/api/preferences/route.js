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

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .maybeSingle();

    const prefs = profile?.preferences || {};

    return NextResponse.json({
      adsViewed: prefs.ads_viewed || [],
      profilesNotInterested: prefs.profiles_not_interested || [],
      adPreferences: prefs.ad_preferences || [],
    });
  } catch (err) {
    console.error('Preferences API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
