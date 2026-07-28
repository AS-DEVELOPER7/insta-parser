/**
 * Browser-side image optimizer & Cloudinary direct uploader with upload preset support
 * Preserves original Instagram export filenames (e.g. 1585890758668552.jpg) as public_id
 * to prevent duplicate uploads across HTML and JSON formats.
 */
export async function uploadMediaToCloudinary(fileZipEntry, pathHint, targetFolder = '') {
  if (!fileZipEntry) return null;

  try {
    // Format folder to always be under root "insta_parser"
    let uploadFolder = 'insta_parser';
    if (targetFolder) {
      const cleanSub = targetFolder.replace(/^insta_parser\/?/i, '').replace(/^\/+/, '');
      uploadFolder = cleanSub ? `insta_parser/${cleanSub}` : 'insta_parser';
    }

    const isVideo = pathHint.endsWith('.mp4') || pathHint.endsWith('.mov') || pathHint.endsWith('.webm');

    // Extract exact original filename without path or extension (e.g., "1585890758668552")
    const rawFilename = (pathHint || '').split('/').pop().split('?')[0];
    const baseName = rawFilename.replace(/\.[^/.]+$/, '');
    const cleanPublicId = baseName.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 80);

    // Extract blob from JSZip entry
    const rawBlob = await fileZipEntry.async('blob');
    let blobToUpload = rawBlob;

    // Compress image client-side if it's an image
    if (!isVideo && typeof window !== 'undefined') {
      try {
        blobToUpload = await compressImageBlob(rawBlob);
      } catch (e) {
        console.warn('Canvas image compression fallback to raw blob:', e);
      }
    }

    // Request signed upload payload from Next.js server with original public_id
    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder: uploadFolder,
        public_id: cleanPublicId || undefined,
      }),
    });

    if (!signRes.ok) {
      throw new Error('Failed to get Cloudinary signature');
    }

    const { signature, timestamp, cloudName, apiKey } = await signRes.json();

    // Direct browser-to-Cloudinary upload
    const formData = new FormData();
    formData.append('file', blobToUpload, rawFilename);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', uploadFolder);

    if (cleanPublicId) {
      formData.append('public_id', cleanPublicId);
      formData.append('overwrite', 'true');
    }

    const resourceType = isVideo ? 'video' : 'image';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Cloudinary upload error:', errText);
      throw new Error('Cloudinary direct upload failed');
    }

    const data = await uploadRes.json();
    return {
      mediaUrl: data.secure_url,
      publicId: data.public_id,
      mediaType: isVideo ? 'video' : 'image',
    };
  } catch (error) {
    console.error('Failed to upload media item:', pathHint, error);
    return null;
  }
}

/**
 * Resizes images in browser canvas to max 1440px width/height & compresses JPEG to 82% quality
 */
function compressImageBlob(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_SIZE = 1440;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}
