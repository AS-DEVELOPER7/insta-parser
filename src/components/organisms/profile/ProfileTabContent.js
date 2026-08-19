'use client';

import { useState, useEffect } from 'react';
import { Grid, Film, User, Eye, X, Layers, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ProfileInfoDetails from '@/components/molecules/profile/ProfileInfoDetails';
import { PAGINATION_LIMITS } from '@/constants/config';

const BATCH_SIZE = PAGINATION_LIMITS.POSTS_BATCH_SIZE;

export default function ProfileTabContent({
  activeTab = 'posts',
  setActiveTab,
  posts = [],
  stories = [],
  profile = {},
}) {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const [postsLimit, setPostsLimit] = useState(BATCH_SIZE);
  const [storiesLimit, setStoriesLimit] = useState(BATCH_SIZE);

  // Auto load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 500) {
        if (activeTab === 'posts' && postsLimit < posts.length) {
          setPostsLimit((prev) => Math.min(prev + BATCH_SIZE, posts.length));
        } else if (activeTab === 'stories' && storiesLimit < stories.length) {
          setStoriesLimit((prev) => Math.min(prev + BATCH_SIZE, stories.length));
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, postsLimit, storiesLimit, posts.length, stories.length]);

  const handleOpenPost = (post) => {
    setSelectedPost(post);
    setCurrentMediaIndex(0);
  };

  const mediaList = selectedPost?.post_media || [];
  const currentMedia = mediaList[currentMediaIndex] || (selectedPost?.media_url ? { media_url: selectedPost.media_url, media_type: selectedPost.media_type } : null);
  const isVideo = currentMedia?.media_type === 'video' || currentMedia?.media_url?.match(/\.(mp4|mov|webm)/i);

  const visiblePosts = posts.slice(0, postsLimit);
  const visibleStories = stories.slice(0, storiesLimit);

  return (
    <div>
      {/* Tab Navigation showing TOTAL Counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-gray-200 dark:border-[#1f1f1f]">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'posts'
              ? 'bg-ig-primary text-white shadow-md font-bold'
              : 'bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-[#242424] text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Posts"
        >
          <Grid size={18} />
          <span>Posts ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'stories'
              ? 'bg-ig-primary text-white shadow-md font-bold'
              : 'bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-[#242424] text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Stories"
        >
          <Film size={18} />
          <span>Stories ({stories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'info'
              ? 'bg-ig-primary text-white shadow-md font-bold'
              : 'bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-[#242424] text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Personal Info"
        >
          <User size={18} />
          <span>Personal Info</span>
        </button>
      </div>

      {/* TAB 1: POSTS GRID (PROGRESSIVE SCROLL) */}
      {activeTab === 'posts' && (
        <div>
          {posts && posts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                {visiblePosts.map((post, idx) => {
                  const mediaItems = post.post_media || [];
                  const firstMedia = mediaItems[0];
                  const mediaUrl = firstMedia?.media_url || post.media_url;
                  const isVideoPost =
                    firstMedia?.media_type === 'video' ||
                    mediaUrl?.endsWith('.mp4') ||
                    mediaUrl?.endsWith('.mov');
                  const isCarousel = mediaItems.length > 1;

                  if (!mediaUrl) return null;

                  return (
                    <div
                      key={post.id || idx}
                      onClick={() => handleOpenPost(post)}
                      className="relative aspect-square bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] group overflow-hidden cursor-pointer rounded-2xl transition-all hover:scale-[1.02] shadow-sm"
                    >
                      {isVideoPost ? (
                        <video src={mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="User post" className="w-full h-full object-cover" />
                      )}

                      {/* Carousel indicator badge for multi-photo posts */}
                      {isCarousel && (
                        <div className="absolute top-2.5 right-2.5 bg-black/75 text-white p-1.5 rounded-lg shadow-md z-10">
                          <Layers size={14} />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
                        <Eye size={20} />
                        <span className="text-xs font-semibold">
                          {isCarousel ? `View ${mediaItems.length} Photos` : 'Preview'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Indicator / Progress */}
              {postsLimit < posts.length && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <Loader2 size={16} className="animate-spin text-ig-primary" />
                    <span>Showing {visiblePosts.length} of {posts.length} posts (scroll to load more)</span>
                  </div>
                  <button
                    onClick={() => setPostsLimit((prev) => Math.min(prev + BATCH_SIZE, posts.length))}
                    className="px-4 py-2 bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-xs font-semibold text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-[#333] transition-colors"
                  >
                    Load More Posts
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-3xl p-8 shadow-sm">
              <Grid size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300">No Posts Displayed</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Your uploaded posts will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STORIES GRID (PROGRESSIVE SCROLL) */}
      {activeTab === 'stories' && (
        <div>
          {stories && stories.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {visibleStories.map((story, idx) => {
                  const mediaUrl = story.media_url;
                  const isVideoStory =
                    story.media_type === 'video' ||
                    mediaUrl?.endsWith('.mp4') ||
                    mediaUrl?.endsWith('.mov');

                  if (!mediaUrl) return null;

                  return (
                    <div
                      key={story.id || idx}
                      onClick={() => handleOpenPost({ post_media: [{ media_url: mediaUrl, media_type: story.media_type }] })}
                      className="relative aspect-[9/16] bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] group overflow-hidden cursor-pointer rounded-2xl transition-all hover:scale-[1.02] shadow-sm"
                    >
                      {isVideoStory ? (
                        <video src={mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="User story" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye size={20} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Indicator / Progress */}
              {storiesLimit < stories.length && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <Loader2 size={16} className="animate-spin text-ig-primary" />
                    <span>Showing {visibleStories.length} of {stories.length} stories (scroll to load more)</span>
                  </div>
                  <button
                    onClick={() => setStoriesLimit((prev) => Math.min(prev + BATCH_SIZE, stories.length))}
                    className="px-4 py-2 bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-xs font-semibold text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-[#333] transition-colors"
                  >
                    Load More Stories
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-3xl p-8 shadow-sm">
              <Film size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300">No Stories Available</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Stories extracted from your export archive will show here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PERSONAL DETAILS GRID */}
      {activeTab === 'info' && (
        <ProfileInfoDetails
          email={profile.email}
          phone={profile.phone}
          dob={profile.dob}
          gender={profile.gender}
        />
      )}

      {/* Interactive Carousel & Lightbox Modal */}
      {selectedPost && currentMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
          >
            <X size={20} />
          </button>

          <div onClick={(e) => e.stopPropagation()} className="relative max-w-2xl max-h-[85vh] w-full overflow-hidden rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-[#262626] shadow-2xl">
            {/* Carousel Navigation Arrows */}
            {mediaList.length > 1 && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    onClick={() => setCurrentMediaIndex((prev) => prev - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors z-30 shadow-lg"
                    title="Previous media"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}

                {currentMediaIndex < mediaList.length - 1 && (
                  <button
                    onClick={() => setCurrentMediaIndex((prev) => prev + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors z-30 shadow-lg"
                    title="Next media"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}

                {/* Counter Badge (e.g. 1 / 3) */}
                <div className="absolute top-3 right-3 bg-black/75 text-white px-3 py-1 rounded-full text-xs font-semibold z-30 border border-white/10">
                  {currentMediaIndex + 1} / {mediaList.length}
                </div>
              </>
            )}

            {/* Media Content */}
            <div className="relative flex items-center justify-center bg-black min-h-[300px]">
              {isVideo ? (
                <video src={currentMedia.media_url} controls autoPlay className="max-h-[70vh] w-auto mx-auto object-contain" />
              ) : (
                <img src={currentMedia.media_url} alt="Post content" className="max-h-[70vh] w-auto mx-auto object-contain" />
              )}
            </div>

            {/* Dots Indicator */}
            {mediaList.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 dark:bg-[#121212] border-t border-gray-200 dark:border-[#1f1f1f]">
                {mediaList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentMediaIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentMediaIndex ? 'bg-ig-primary w-4' : 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Caption Footer */}
            {selectedPost.caption && (
              <p className="p-4 text-xs text-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-[#121212] border-t border-gray-200 dark:border-[#1f1f1f] max-h-28 overflow-y-auto leading-relaxed">
                {selectedPost.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
