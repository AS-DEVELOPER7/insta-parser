import Image from 'next/image';
import { Grid, Bookmark, Film } from 'lucide-react';

export default function ProfileGrid({ posts = [] }) {
  return (
    <div>
      {/* Grid Tab Navigation */}
      <div className="flex items-center justify-around sm:justify-center sm:gap-12 border-b border-ig-border mb-6">
        <button className="flex items-center gap-2 py-3 border-t-2 border-white text-white font-semibold text-xs uppercase tracking-wider">
          <Grid size={18} />
          <span className="hidden sm:inline">Posts</span>
        </button>
        <button className="flex items-center gap-2 py-3 text-gray-500 hover:text-white font-semibold text-xs uppercase tracking-wider">
          <Film size={18} />
          <span className="hidden sm:inline">Reels</span>
        </button>
        <button className="flex items-center gap-2 py-3 text-gray-500 hover:text-white font-semibold text-xs uppercase tracking-wider">
          <Bookmark size={18} />
          <span className="hidden sm:inline">Saved</span>
        </button>
      </div>

      {/* Grid Thumbnail Display */}
      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {posts.map((post) => {
            const firstMedia = post.post_media?.[0];
            if (!firstMedia) return null;

            return (
              <div
                key={post.id}
                className="relative aspect-square bg-ig-surface group overflow-hidden cursor-pointer rounded-sm md:rounded-lg"
              >
                {firstMedia.media_type === 'video' ? (
                  <video
                    src={firstMedia.media_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={firstMedia.media_url}
                    alt="Post grid item"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-16">
          No posts uploaded to your profile yet.
        </div>
      )}
    </div>
  );
}
