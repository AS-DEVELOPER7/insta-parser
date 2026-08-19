'use client';

export default function ConversationItem({ conversation, isActive, onClick }) {
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
        <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
          {conversation.participant_name}
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
