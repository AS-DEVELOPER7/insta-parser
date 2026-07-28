'use client';

import Image from 'next/image';

export default function StoriesTray({ stories = [], onSelectStory }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="bg-black border border-ig-border rounded-xl p-4 mb-6 max-w-lg mx-auto overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-4">
        {stories.map((story, idx) => (
          <button
            key={story.id || idx}
            onClick={() => onSelectStory && onSelectStory(story)}
            className="flex flex-col items-center gap-1.5 min-w-[68px] group"
          >
            <div className="story-ring w-16 h-16 flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="story-ring-inner w-full h-full relative overflow-hidden">
                {story.media_url ? (
                  <Image
                    src={story.media_url}
                    alt="Story"
                    fill
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-ig-surface flex items-center justify-center text-xs text-gray-400">
                    Story
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-300 truncate max-w-[64px]">
              {new Date(story.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
