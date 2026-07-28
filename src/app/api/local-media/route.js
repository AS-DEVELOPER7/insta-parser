import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const LOCAL_EXPORT_DIR = '/Users/jabernada/Documents/instagram-a_sagir77-2026-07-26-gzzadM8H';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileRelPath = searchParams.get('file');

    if (!fileRelPath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    // Prevent directory traversal
    const cleanPath = fileRelPath.replace(/(\.\.[\/\\])+/g, '');
    const absolutePath = path.join(LOCAL_EXPORT_DIR, cleanPath);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is a directory, not a media file' }, { status: 400 });
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const lower = absolutePath.toLowerCase();

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
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('Local media route error:', err);
    return NextResponse.json({ error: 'Failed to read media file' }, { status: 500 });
  }
}
