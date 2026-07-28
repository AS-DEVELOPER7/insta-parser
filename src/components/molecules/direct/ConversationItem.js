'use client';

export default function ConversationItem({ conversation, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150 ${
        isActive
          ? 'bg-[#1a1a1a]'
          : 'hover:bg-[#111111]'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg uppercase transition-all ${
          isActive
            ? 'bg-ig-primary text-white ring-2 ring-ig-primary ring-offset-2 ring-offset-black'
            : 'bg-[#2a2a2a] text-white'
        }`}
      >
        {conversation.participant_name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
          {conversation.participant_name}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          Chat history archive
        </div>
      </div>

      {/* Active indicator dot */}
      {isActive && (
        <div className="w-2 h-2 rounded-full bg-ig-primary flex-shrink-0" />
      )}
    </button>
  );
}
