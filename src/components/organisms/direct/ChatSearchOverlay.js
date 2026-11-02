'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Search, X, Loader2, MessageSquare, Star } from 'lucide-react';
import {
  useLazySearchMessagesQuery,
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from '@/store/api/apiSlice';

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
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'starred' | 'unstarred'
  const [togglingId, setTogglingId] = useState(null);
  const inputRef = useRef(null);

  const [triggerSearch, { isFetching }] = useLazySearchMessagesQuery();
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();

  // Query live favorites for this conversation to reactively detect starred status
  const { data: favoritesData } = useGetFavoritesQuery(
    { conversationId },
    { skip: !conversationId }
  );

  const favoritesMap = useMemo(() => {
    const byId = new Map();
    const list = [];
    (favoritesData?.favorites || []).forEach((fav) => {
      if (fav.message_id) {
        byId.set(fav.message_id, fav);
      }
      if (fav.message) {
        const cleanContent = (fav.message.content || '').trim().toLowerCase();
        const mediaKey = fav.message.media_url || '';
        const sig = `${fav.message.sender_name}::${cleanContent || mediaKey}`;
        const timeMs = fav.message.sent_at ? new Date(fav.message.sent_at).getTime() : 0;
        list.push({ sig, timeMs, fav });
      }
    });
    return { byId, list };
  }, [favoritesData]);

  // Focus input automatically on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || !conversationId) {
      setResults([]);
      setTotalCount(0);
      setFilterMode('all');
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

  // Attach starred status, tags, and notes to each search result
  const resultsWithFavoriteStatus = useMemo(() => {
    return results.map((msg) => {
      // 1. Direct ID match from live favoritesData
      let fav = favoritesMap.byId.get(msg.id);

      // 2. Timezone duplicate match from live favoritesData (within 36h only)
      if (!fav && favoritesMap.list.length > 0) {
        const cleanContent = (msg.content || '').trim().toLowerCase();
        const mediaKey = msg.media_url || '';
        const sig = `${msg.sender_name}::${cleanContent || mediaKey}`;
        const timeMs = msg.sent_at ? new Date(msg.sent_at).getTime() : 0;
        const matched = favoritesMap.list.find(
          (f) => f.sig === sig && Math.abs(timeMs - f.timeMs) / (1000 * 3600) <= 36
        );
        if (matched) {
          fav = matched.fav;
        }
      }

      // 3. Fallback to API search result ONLY if favoritesData is not yet loaded
      if (!fav && !favoritesData && msg.is_favorite) {
        fav = {
          tag: msg.favorite_tag,
          note: msg.favorite_note,
          message_id: msg.favorite_message_id || msg.id,
        };
      }

      return {
        ...msg,
        isStarred: Boolean(fav),
        starredTag: fav?.tag || 'General',
        starredNote: fav?.note || null,
        starredMessageId: fav?.message_id || msg.id,
      };
    });
  }, [results, favoritesMap, favoritesData]);

  const starredCount = useMemo(() => {
    return resultsWithFavoriteStatus.filter((r) => r.isStarred).length;
  }, [resultsWithFavoriteStatus]);

  const unstarredCount = useMemo(() => {
    return resultsWithFavoriteStatus.filter((r) => !r.isStarred).length;
  }, [resultsWithFavoriteStatus]);

  const displayedResults = useMemo(() => {
    if (filterMode === 'starred') {
      return resultsWithFavoriteStatus.filter((r) => r.isStarred);
    }
    if (filterMode === 'unstarred') {
      return resultsWithFavoriteStatus.filter((r) => !r.isStarred);
    }
    return resultsWithFavoriteStatus;
  }, [resultsWithFavoriteStatus, filterMode]);

  const handleToggleStar = async (e, msg) => {
    e.stopPropagation();
    if (togglingId === msg.id) return;
    setTogglingId(msg.id);
    try {
      if (msg.isStarred) {
        await removeFavorite({ messageId: msg.starredMessageId || msg.id }).unwrap();
      } else {
        await addFavorite({
          messageId: msg.id,
          conversationId,
          tag: 'General',
        }).unwrap();
      }
    } catch (err) {
      console.error('Failed to toggle star in search:', err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-[#000000] transition-colors duration-200">
      {/* ── Top Header / Search Bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#222222] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors flex-shrink-0"
          title="Back to conversation"
          aria-label="Back to conversation"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Input Field */}
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#161616] rounded-xl border border-gray-200 dark:border-[#282828] focus-within:border-ig-primary/60 transition-colors">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in chat with ${participantName}...`}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none min-w-0"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setFilterMode('all');
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0 p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Subheader / Count & Starred Mention Filters ── */}
      {query.trim() && (
        <div className="px-4 sm:px-5 py-2.5 bg-gray-50 dark:bg-[#121212] border-b border-gray-200 dark:border-[#222222] flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white">
              {isFetching
                ? 'Searching...'
                : results.length > 0
                ? `${results.length} result${results.length !== 1 ? 's' : ''} found`
                : 'No results'}
            </span>

            {/* Quick Mention & Filter Pills */}
            {!isFetching && results.length > 0 && (
              <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    filterMode === 'all'
                      ? 'bg-gray-200 dark:bg-[#282828] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All ({results.length})
                </button>

                <button
                  onClick={() => setFilterMode(filterMode === 'starred' ? 'all' : 'starred')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                    filterMode === 'starred'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20'
                  }`}
                  title="Filter to show only starred messages"
                >
                  <Star size={10} className={filterMode === 'starred' ? 'fill-white' : 'fill-amber-400'} />
                  <span>Starred ({starredCount})</span>
                </button>

                <button
                  onClick={() => setFilterMode(filterMode === 'unstarred' ? 'all' : 'unstarred')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                    filterMode === 'unstarred'
                      ? 'bg-gray-700 text-white border-gray-700 dark:bg-gray-200 dark:text-gray-900 shadow-xs ring-2 ring-gray-400/30'
                      : 'bg-gray-100 dark:bg-[#1c1c1c] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#252525]'
                  }`}
                  title="Filter to show only unstarred messages"
                >
                  <span>Not starred ({unstarredCount})</span>
                </button>
              </div>
            )}
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline">Click a message to jump to it</span>
        </div>
      )}

      {/* ── Search Results List ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#181818]">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 size={24} className="animate-spin text-ig-primary" />
            <span className="text-xs">Searching messages...</span>
          </div>
        ) : query.trim() && displayedResults.length > 0 ? (
          displayedResults.map((msg) => {
            const senderInitial = (msg.sender_name || participantName).charAt(0).toUpperCase();
            const isThisLoading = togglingId === msg.id;

            return (
              <button
                key={msg.id}
                onClick={() => onSelectMessage(msg, query)}
                className={`w-full flex items-center gap-3.5 px-4 sm:px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-[#141414] active:bg-gray-100 dark:active:bg-[#1a1a1a] text-left transition-colors group relative ${
                  msg.isStarred
                    ? 'border-l-3 border-l-amber-500 bg-amber-500/[0.04]'
                    : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-0.5 flex-shrink-0 shadow-sm">
                  <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center font-bold text-gray-900 dark:text-white text-xs uppercase">
                    {senderInitial}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-ig-primary transition-colors truncate">
                        {msg.sender_name || participantName}
                      </span>

                      {/* Explicit Mention: Starred vs Not starred */}
                      {msg.isStarred ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex-shrink-0 shadow-xs">
                          <Star size={10} className="fill-amber-400 text-amber-500" />
                          <span>Starred</span>
                          {msg.starredTag && (
                            <span className="opacity-80 font-normal">
                              • {msg.starredTag}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-500 border border-gray-200/80 dark:border-[#282828] flex-shrink-0">
                          <Star size={9} className="opacity-40" />
                          <span>Not starred</span>
                        </span>
                      )}
                    </div>

                    {/* Timestamp & Star toggle button */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(msg.sent_at)}
                      </span>

                      <button
                        onClick={(e) => handleToggleStar(e, msg)}
                        disabled={isThisLoading}
                        className={`p-1.5 rounded-lg transition-all ${
                          msg.isStarred
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                            : 'text-gray-300 dark:text-gray-600 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-[#202020]'
                        }`}
                        title={msg.isStarred ? 'Remove from starred' : 'Add to starred'}
                        aria-label={msg.isStarred ? 'Remove from starred' : 'Add to starred'}
                      >
                        {isThisLoading ? (
                          <Loader2 size={13} className="animate-spin text-amber-500" />
                        ) : (
                          <Star size={14} className={msg.isStarred ? 'fill-amber-400 text-amber-500' : ''} />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed break-words">
                    <HighlightText text={msg.content || (msg.media_url ? '[Media Message]' : '[Shared Content]')} query={query} />
                  </p>

                  {/* Note Preview if starred with note */}
                  {msg.isStarred && msg.starredNote && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-700/90 dark:text-amber-300/90 italic truncate">
                      <span>📝</span>
                      <span className="truncate">{msg.starredNote}</span>
                    </div>
                  )}
                </div>

                {/* Media preview thumbnail if present */}
                {msg.media_url && !msg.media_url.match(/\.(mp4|mov|webm|m4a|mp3)/i) && (
                  <div className="w-11 h-11 rounded-lg overflow-hidden border border-gray-200 dark:border-[#282828] flex-shrink-0 ml-2">
                    <img
                      src={msg.media_url}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </button>
            );
          })
        ) : query.trim() ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-4 text-gray-400 dark:text-gray-600">
              <Search size={28} />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {filterMode === 'starred'
                ? 'No starred messages found'
                : filterMode === 'unstarred'
                ? 'No unstarred messages found'
                : 'No matching messages'}
            </h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              {filterMode === 'starred'
                ? `None of the matches containing "${query}" are starred.`
                : filterMode === 'unstarred'
                ? `All matches containing "${query}" are already starred.`
                : `No messages found containing "${query}" in this conversation.`}
            </p>
            {filterMode !== 'all' && (
              <button
                onClick={() => setFilterMode('all')}
                className="mt-3 text-xs font-semibold text-ig-primary hover:underline"
              >
                View all {results.length} matches
              </button>
            )}
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
