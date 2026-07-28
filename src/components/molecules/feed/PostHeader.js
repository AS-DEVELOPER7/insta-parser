import Avatar from '@/components/atoms/Avatar';
import { MoreHorizontal, MapPin } from 'lucide-react';

export default function PostHeader({ authorName, avatarUrl, location }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-ig-border/40">
      <div className="flex items-center gap-3">
        <Avatar src={avatarUrl} alt={authorName} size="sm" hasStory={true} />
        <div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm text-white">{authorName || 'instagram_user'}</span>
          </div>
          {location && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={10} />
              <span>{location}</span>
            </div>
          )}
        </div>
      </div>

      <button className="text-gray-400 hover:text-white p-1">
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}
