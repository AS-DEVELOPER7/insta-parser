'use client';

import Image from 'next/image';
import { Play, ExternalLink, Volume2 } from 'lucide-react';

export default function MediaGridItem({ item, onClick }) {
  const url = item.media_url || item.share_url;
  const isAudio = url?.includes('/audio/') || url?.match(/\.(m4a|mp3|ogg|wav)/i) || item.media_type === 'audio' || item.media_type === 'voice_note';
  const isVid = !isAudio && (url?.match(/\.(mp4|mov|webm)/i) || item.media_type === 'video' || url?.includes('/reel/'));
  const isExternalLink = !item.media_url && item.share_url;

  return (
    <button
      onClick={() => onClick({ url, isAudio, isVid, isExternalLink, shareText: item.share_text, sender: item.sender_name })}
      className="relative aspect-square rounded-2xl overflow-hidden bg-[#141414] border border-[#242424] hover:border-ig-primary/60 transition-all group p-1 text-left"
    >
      {item.media_url ? (
        isAudio ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#1e1b2e] to-[#0a0a0a] rounded-xl border border-purple-500/20">
            <div className="w-10 h-10 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center mb-2 shadow-inner">
              <Volume2 size={20} />
            </div>
            <span className="text-[11px] text-gray-200 font-semibold truncate w-full">Voice Note</span>
            <span className="text-[9px] text-gray-400 truncate w-full mt-0.5">by {item.sender_name || 'User'}</span>
          </div>
        ) : isVid ? (
          <video src={item.media_url} className="w-full h-full object-cover rounded-xl" muted />
        ) : (
          <Image
            src={item.media_url}
            alt="Media asset"
            fill
            className="object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
          />
        )
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0a] rounded-xl">
          <div className="w-8 h-8 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center mb-1">
            {isVid ? <Play size={14} className="fill-current" /> : <ExternalLink size={14} />}
          </div>
          <span className="text-[10px] text-gray-300 font-medium line-clamp-2 leading-tight">
            {item.share_text || (url?.includes('/reel/') ? 'Reel Share' : 'Shared Link')}
          </span>
        </div>
      )}

      {isVid && item.media_url && (
        <div className="absolute bottom-2 right-2 bg-black/80 text-white rounded-full p-1.5 shadow-md">
          <Play size={12} className="fill-current" />
        </div>
      )}

      {isAudio && item.media_url && (
        <div className="absolute bottom-2 right-2 bg-purple-600/90 text-white rounded-full p-1.5 shadow-md">
          <Volume2 size={12} />
        </div>
      )}
    </button>
  );
}
