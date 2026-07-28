'use client';

import { User } from 'lucide-react';

export default function Avatar({ src, alt = 'User Avatar', size = 'md', hasStory = false }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24 md:w-36 md:h-36',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 30,
    xl: 48,
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const currentIconSize = iconSizes[size] || iconSizes.md;

  const renderContent = () => {
    if (src) {
      return (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    return (
      <div className="w-full h-full bg-[#262626] text-gray-400 flex items-center justify-center rounded-full">
        <User size={currentIconSize} />
      </div>
    );
  };

  if (hasStory) {
    return (
      <div className={`story-ring ${currentSize} shrink-0 flex items-center justify-center`}>
        <div className="story-ring-inner w-full h-full relative overflow-hidden rounded-full">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${currentSize} shrink-0 rounded-full overflow-hidden border border-ig-border bg-ig-surface flex items-center justify-center`}>
      {renderContent()}
    </div>
  );
}
