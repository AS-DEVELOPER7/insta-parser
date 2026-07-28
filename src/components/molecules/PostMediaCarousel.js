'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PostMediaCarousel({ mediaList = [] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentMedia = mediaList[currentIdx];
  const isVideo = currentMedia?.media_type === 'video';

  return (
    <div className="relative aspect-square bg-ig-surface flex items-center justify-center overflow-hidden">
      {currentMedia ? (
        isVideo ? (
          <video
            src={currentMedia.media_url}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <Image
            src={currentMedia.media_url}
            alt="Post slide"
            fill
            className="object-cover"
          />
        )
      ) : (
        <div className="text-gray-500 text-sm">No media available</div>
      )}

      {mediaList.length > 1 && (
        <>
          {currentIdx > 0 && (
            <button
              onClick={() => setCurrentIdx(currentIdx - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {currentIdx < mediaList.length - 1 && (
            <button
              onClick={() => setCurrentIdx(currentIdx + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {mediaList.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIdx ? 'bg-ig-primary w-2 h-2' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
