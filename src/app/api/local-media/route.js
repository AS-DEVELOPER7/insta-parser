import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEFAULT_LOCAL_DIR = '/Users/jabernada/Documents/instagram-a_sagir77-2026-07-26-gzzadM8H';

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
    const fileRelPath = searchParams.get('file');

    if (!fileRelPath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    const baseDir = process.env.LOCAL_EXPORT_DIR || DEFAULT_LOCAL_DIR;
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(resolvedBase, fileRelPath);

    // Cryptographic-grade path traversal containment guard
    if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
      return NextResponse.json({ error: 'Access denied: Invalid file path' }, { status: 403 });
    }

    if (!fs.existsSync(resolvedTarget)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const stat = fs.statSync(resolvedTarget);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is a directory, not a media file' }, { status: 400 });
    }

    const fileBuffer = fs.readFileSync(resolvedTarget);
    const lower = resolvedTarget.toLowerCase();

    let contentType = 'image/jpeg';
    if (lower.endsWith('.png')) contentType = 'image/png';
    else if (lower.endsWith('.webp')) contentType = 'image/webp';
    else if (lower.endsWith('.mp4')) contentType = 'video/mp4';
    else if (lower.endsWith('.mov')) contentType = 'video/quicktime';
    else if (lower.endsWith('.m4a') || lower.endsWith('.mp3')) contentType = 'audio/mpeg';
    else if (lower.endsWith('.ogg')) contentType = 'audio/ogg';
    else if (lower.endsWith('.wav')) contentType = 'audio/wav';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Local media route error:', err);
    return NextResponse.json({ error: 'Failed to read media file' }, { status: 500 });
  }
}
