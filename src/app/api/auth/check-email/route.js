import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// In-memory sliding window rate limiter for email enumeration prevention
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 12;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, record);
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  rateLimitMap.set(ip, record);
  return true;
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ exists: false });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server auth configuration missing' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check profiles table directly (targeted lookup, no full users dump)
    const { data: profileMatch } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    return NextResponse.json({ exists: Boolean(profileMatch) });
  } catch (err) {
    console.error('Check email error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
