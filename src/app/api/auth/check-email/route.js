import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server auth configuration missing' }, { status: 500 });
    }

    // Initialize Supabase Admin Client using Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Check profiles table first
    const { data: profileMatch } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileMatch) {
      return NextResponse.json({ exists: true });
    }

    // 2. Check auth.users via Admin API
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (!listError && usersData?.users) {
      const exists = usersData.users.some(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (exists) {
        return NextResponse.json({ exists: true });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    console.error('Check email error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
