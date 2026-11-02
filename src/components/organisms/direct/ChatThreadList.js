'use client';

import { useState, useMemo } from 'react';
import { Search, X, MessageCircle, ChevronLeft } from 'lucide-react';
import ConversationItem from '@/components/molecules/direct/ConversationItem';

export default function ChatThreadList({
  conversations = [],
  activeConvId,
  onSelectConversation,
  collapsed,
  onToggleCollapse,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    return conversations.filter((c) =>
      c.participant_name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [conversations, query]);

  /* ── Collapsed: show only avatar initials ── */
  if (collapsed) {
    return (
      <div className="flex flex-col items-center pt-4 pb-4 gap-2 bg-slate-50 dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-[#262626] w-[72px] flex-shrink-0 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors mb-2"
          title="Expand"
        >
          <MessageCircle size={18} />
        </button>

        <div className="w-8 h-px bg-gray-200 dark:bg-[#262626]" />

        <div className="flex flex-col items-center gap-2 w-full px-2 overflow-y-auto max-h-[calc(100vh-10rem)] scrollbar-none">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation?.(conv.id)}
              title={conv.participant_name}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase flex-shrink-0 transition-all ${
                activeConvId === conv.id
                  ? 'bg-ig-primary text-white ring-2 ring-ig-primary ring-offset-1 ring-offset-white dark:ring-offset-black'
                  : 'bg-gray-200 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-[#3a3a3a]'
              }`}
            >
              {conv.participant_name.charAt(0)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Expanded ── */
  return (
    <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-[#000000] border-r border-gray-200 dark:border-[#222222] transition-all duration-300">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
          Messages
        </h2>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors"
            title="Collapse"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828] focus-within:border-ig-primary rounded-xl px-3.5 py-2.5 transition-colors shadow-sm">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none flex-1 min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 mt-2 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeConvId === conv.id}
              onClick={() => onSelectConversation?.(conv.id)}
            />
          ))
        ) : (
          <div className="px-5 py-10 text-center">
            <Search size={28} className="text-gray-400 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {query ? `No results for "${query}"` : 'No conversations'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-200 dark:border-[#1a1a1a]">
        <span className="text-[11px] text-gray-500 dark:text-gray-600 font-medium">
          {filtered.length} of {conversations.length} conversations
        </span>
      </div>
    </div>
  );
}
