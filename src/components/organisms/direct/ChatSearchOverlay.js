'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, X, Loader2, MessageSquare } from 'lucide-react';
import { useLazySearchMessagesQuery } from '@/store/api/apiSlice';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const dateFormatted = d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeFormatted = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateFormatted}, ${timeFormatted}`;
}

function HighlightText({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  
  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="font-bold text-gray-900 dark:text-white bg-ig-primary/30 px-1 rounded">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function ChatSearchOverlay({
  conversationId,
  participantName,
  ownerUsername,
  onSelectMessage,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const inputRef = useRef(null);

  const [triggerSearch, { isFetching }] = useLazySearchMessagesQuery();

  // Focus input automatically on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || !conversationId) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    const timer = setTimeout(() => {
      triggerSearch({ conversationId, query }, true)
        .unwrap()
        .then((res) => {
          const matches = res.matches || [];
          setResults(matches);
          setTotalCount(res.count || matches.length);
        })
        .catch((err) => console.error('Search error:', err));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, conversationId, triggerSearch]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-[#0d0d0d] transition-colors duration-200">
      {/* ── Top Header / Search Bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#1f1f1f] bg-white dark:bg-[#0d0d0d] flex-shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Input Field */}
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] focus-within:border-ig-primary/60 transition-colors">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in chat with ${participantName}...`}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Subheader / Count ── */}
      {query.trim() && (
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#090909] border-b border-gray-200 dark:border-[#1f1f1f] flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
          <span>
            {isFetching
              ? 'Searching...'
              : results.length > 0
              ? `${results.length} result${results.length !== 1 ? 's' : ''} found`
              : 'No results'}
          </span>
          <span className="text-[11px] text-gray-500">Click a message to jump to it</span>
        </div>
      )}

      {/* ── Search Results List ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#181818]">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 size={24} className="animate-spin text-ig-primary" />
            <span className="text-xs">Searching messages...</span>
          </div>
        ) : query.trim() && results.length > 0 ? (
          results.map((msg) => {
            const senderInitial = (msg.sender_name || participantName).charAt(0).toUpperCase();

            return (
              <button
                key={msg.id}
                onClick={() => onSelectMessage(msg)}
                className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-[#141414] active:bg-gray-100 dark:active:bg-[#1a1a1a] text-left transition-colors group"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-ig-primary flex items-center justify-center font-bold text-white text-base uppercase flex-shrink-0 shadow-sm">
                  {senderInitial}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-ig-primary transition-colors truncate">
                      {msg.sender_name || participantName}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatDate(msg.sent_at)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed break-words">
                    <HighlightText text={msg.content || (msg.media_url ? '[Media Message]' : '[Shared Content]')} query={query} />
                  </p>
                </div>
              </button>
            );
          })
        ) : query.trim() ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-4 text-gray-400 dark:text-gray-600">
              <Search size={28} />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">No matching messages</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              No messages found containing &quot;{query}&quot; in this conversation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-4 text-gray-400 dark:text-gray-600">
              <MessageSquare size={28} />
            </div>
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Search messages</h4>
            <p className="text-xs text-gray-500 dark:text-gray-600 mt-1 max-w-xs">
              Type a word or phrase above to search all historical messages in this chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
