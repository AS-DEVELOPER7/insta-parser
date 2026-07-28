"use client";

import { useState, useMemo } from "react";
import { Search, X, PenSquare, MessageCircle, ChevronLeft } from "lucide-react";
import ConversationItem from "@/components/molecules/direct/ConversationItem";

export default function ChatThreadList({
  conversations = [],
  activeConvId,
  onSelectConversation,
  collapsed,
  onToggleCollapse,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    return conversations.filter((c) =>
      c.participant_name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [conversations, query]);

  /* ── Collapsed: show only avatar initials ── */
  if (collapsed) {
    return (
      <div className="flex flex-col items-center pt-4 pb-4 gap-2 bg-[#0a0a0a] border-r border-[#262626] w-[72px] flex-shrink-0 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors mb-2"
          title="Expand"
        >
          <MessageCircle size={18} />
        </button>

        <div className="w-8 h-px bg-[#262626]" />

        <div className="flex flex-col items-center gap-2 w-full px-2 overflow-y-auto max-h-[calc(100vh-10rem)] scrollbar-none">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation?.(conv.id)}
              title={conv.participant_name}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase flex-shrink-0 transition-all ${
                activeConvId === conv.id
                  ? "bg-ig-primary text-white ring-2 ring-ig-primary ring-offset-1 ring-offset-black"
                  : "bg-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#3a3a3a]"
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
    <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col h-full bg-[#0a0a0a] border-r border-[#262626] transition-all duration-300">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg text-white tracking-tight">
          Messages
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Collapse"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5 bg-[#1a1a1a] border border-[#2a2a2a] focus-within:border-[#404040] rounded-2xl px-3.5 py-2.5 transition-colors">
          <Search size={14} className="text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1 min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-gray-500 hover:text-gray-300 transition-colors"
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
            <Search size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {query ? `No results for "${query}"` : "No conversations"}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1a1a1a]">
        <span className="text-[11px] text-gray-600">
          {filtered.length} of {conversations.length} conversations
        </span>
      </div>
    </div>
  );
}
