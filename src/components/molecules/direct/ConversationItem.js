'use client';

import { Star } from 'lucide-react';

export default function ConversationItem({ conversation, isActive, onClick, starredCount = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150 ${
        isActive
          ? 'bg-ig-primary text-white shadow-md'
          : 'hover:bg-gray-100 dark:hover:bg-[#111111]'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg uppercase transition-all ${
          isActive
            ? 'bg-white text-ig-primary font-black shadow-inner'
            : 'bg-gray-200 dark:bg-[#2a2a2a] text-gray-700 dark:text-white'
        }`}
      >
        {conversation.participant_name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
            {conversation.participant_name}
          </span>
          {starredCount > 0 && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20'
              }`}
              title={`${starredCount} starred message${starredCount !== 1 ? 's' : ''}`}
            >
              <Star size={9} className={isActive ? 'fill-white' : 'fill-amber-400'} />
              <span>{starredCount}</span>
            </span>
          )}
        </div>
        <div className={`text-xs truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
          Chat history archive
        </div>
      </div>

      {/* Active indicator dot */}
      {isActive && (
        <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
      )}
    </button>
  );
}
