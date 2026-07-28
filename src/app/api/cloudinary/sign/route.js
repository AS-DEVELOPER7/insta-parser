import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const { folder, timestamp, public_id } = await request.json();
    const ts = timestamp || Math.round(new Date().getTime() / 1000);
    const targetFolder = folder || 'insta_parser';

    const paramsToSign = {
      timestamp: ts,
      folder: targetFolder,
    };

    if (public_id) {
      paramsToSign.public_id = public_id;
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
      publicId: public_id || null,
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
