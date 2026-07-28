'use client';

import { Images, Play, Film, Image as ImageIcon, Loader2, Volume2, ExternalLink } from 'lucide-react';
import Skeleton from '@/components/atoms/Skeleton';
import MediaGridItem from '@/components/molecules/media/MediaGridItem';
import MediaLightboxModal from '@/components/molecules/media/MediaLightboxModal';

export default function MediaVaultGrid({
  mediaItems = [],
  counts = {},
  filter = 'all',
  onFilterChange,
  isLoadingInitial = false,
  isLoadingMore = false,
  hasMore = false,
  lightbox = null,
  setLightbox,
}) {
  const tabs = [
    { id: 'all', label: 'All Media', count: counts.all || 0, icon: Images },
    { id: 'image', label: 'Photos', count: counts.photos || 0, icon: ImageIcon },
    { id: 'video', label: 'Videos', count: counts.videos || 0, icon: Film },
    { id: 'audio', label: 'Audio', count: counts.audio || 0, icon: Volume2 },
    { id: 'reel', label: 'Reels', count: counts.reels || 0, icon: Play },
    { id: 'link', label: 'Links', count: counts.links || 0, icon: ExternalLink },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Images size={26} className="text-ig-primary" />
            <span>Media Vault</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse all extracted photos, videos, voice notes, and shared assets across all chats.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#141414] border border-[#242424] rounded-full text-xs font-semibold text-gray-300 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{(counts.all || 0).toLocaleString()} Total Media Assets</span>
        </div>
      </div>

      {/* Category Option Filters with Counts */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#1f1f1f] pb-3 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = filter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onFilterChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-ig-primary text-white shadow-md'
                  : 'bg-[#141414] border border-[#242424] text-gray-400 hover:text-white hover:border-[#333]'
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-[#222] text-gray-400'}`}>
                {t.count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Media Grid */}
      {isLoadingInitial ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : mediaItems.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {mediaItems.map((item) => (
              <MediaGridItem key={item.id} item={item} onClick={(lightboxData) => setLightbox(lightboxData)} />
            ))}
          </div>

          {isLoadingMore && (
            <div className="flex justify-center py-6">
              <span className="flex items-center gap-2 text-xs text-gray-400 bg-[#141414] px-4 py-2 rounded-full border border-[#242424]">
                <Loader2 size={15} className="animate-spin text-ig-primary" />
                Loading more media items ({mediaItems.length} of {tabs.find((t) => t.id === filter)?.count || 0})
              </span>
            </div>
          )}

          {!hasMore && mediaItems.length > 0 && (
            <div className="text-center py-6 text-xs text-gray-600">
              End of media vault ({mediaItems.length} items loaded)
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#121212] border border-[#1f1f1f] rounded-2xl p-8">
          <Images size={36} className="mx-auto text-gray-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-300">No media assets found under this category</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Photos, videos, audio notes, reels, and shared assets extracted from your chats will appear here.
          </p>
        </div>
      )}

      {/* Lightbox Modal */}
      <MediaLightboxModal lightbox={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
