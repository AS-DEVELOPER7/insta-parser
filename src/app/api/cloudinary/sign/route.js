import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folder, timestamp, public_id } = await request.json();
    const ts = timestamp || Math.round(new Date().getTime() / 1000);

    // Sanitize folder to prevent traversal or malicious naming
    const cleanFolder = (folder || 'insta_parser')
      .replace(/[^a-zA-Z0-9_\-\/]/g, '')
      .replace(/(\.\.[\/\\])+/g, '');
    const targetFolder = cleanFolder.startsWith('insta_parser')
      ? cleanFolder
      : `insta_parser/${cleanFolder}`;

    const cleanPublicId = public_id
      ? String(public_id).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 80)
      : null;

    const paramsToSign = {
      timestamp: ts,
      folder: targetFolder,
    };

    if (cleanPublicId) {
      paramsToSign.public_id = cleanPublicId;
      paramsToSign.overwrite = true;
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET || ''
    );

    return NextResponse.json({
      signature,
      timestamp: ts,
      folder: targetFolder,
      publicId: cleanPublicId,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
    });
  } catch (error) {
    console.error('Cloudinary Sign Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Cloudinary signature' },
      { status: 500 }
    );
  }
}
