'use client';

import PostHeader from '@/components/molecules/feed/PostHeader';
import PostMediaCarousel from '@/components/molecules/PostMediaCarousel';
import PostActions from '@/components/molecules/PostActions';

export default function PostCard({ post, authorName, avatarUrl }) {
  const mediaList = post.post_media || [];

  const formattedDate = post.taken_at
    ? new Date(post.taken_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <article className="bg-black border border-ig-border rounded-xl mb-6 overflow-hidden max-w-lg mx-auto">
      {/* Post Header Molecule */}
      <PostHeader authorName={authorName} avatarUrl={avatarUrl} location={post.location} />

      {/* Media Carousel Molecule */}
      <PostMediaCarousel mediaList={mediaList} />

      {/* Actions & Caption Container */}
      <div className="p-3">
        {/* Post Actions Molecule */}
        <PostActions />

        {post.caption && (
          <div className="text-sm text-gray-200 mb-1">
            <span className="font-semibold text-white mr-2">{authorName || 'instagram_user'}</span>
            {post.caption}
          </div>
        )}

        <div className="text-[11px] text-ig-muted uppercase tracking-wider mt-2">
          {formattedDate}
        </div>
      </div>
    </article>
  );
}
