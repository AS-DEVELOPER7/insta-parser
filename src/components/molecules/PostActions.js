'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

export default function PostActions() {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setLiked(!liked)}
          className="transition-transform active:scale-125"
        >
          <Heart
            size={24}
            className={liked ? 'fill-ig-red text-ig-red' : 'text-white hover:text-gray-300'}
          />
        </button>
        <button className="text-white hover:text-gray-300">
          <MessageCircle size={24} />
        </button>
        <button className="text-white hover:text-gray-300">
          <Send size={24} />
        </button>
      </div>

      <button
        onClick={() => setSaved(!saved)}
        className="text-white hover:text-gray-300"
      >
        <Bookmark size={24} className={saved ? 'fill-white' : ''} />
      </button>
    </div>
  );
}
