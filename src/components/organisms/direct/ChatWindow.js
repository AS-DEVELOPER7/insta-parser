"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Search,
  Images,
  X,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import ChatMediaGallery from "@/components/organisms/direct/ChatMediaGallery";
import ChatSearchOverlay from "@/components/organisms/direct/ChatSearchOverlay";
import MessageBubble from "@/components/molecules/MessageBubble";
import EmptyChatState from "@/components/molecules/direct/EmptyChatState";
import Skeleton from "@/components/atoms/Skeleton";
import {
  useLazyGetMessagesQuery,
  useLazySearchMessagesQuery,
  useLazyGetProfileQuery,
  useLazyGetMediaMessagesQuery,
} from "@/store/api/apiSlice";

function cleanName(name) {
  if (!name) return "";
  return String(name)
    .normalize("NFKC")
    .replace(/[~【】._\-\s]/g, "")
    .toLowerCase();
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeFormatted = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today, ${timeFormatted}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeFormatted}`;
  }

  const dateFormatted = d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${dateFormatted}, ${timeFormatted}`;
}

export default function ChatWindow({
  activeConv,
  messages: initialPropMessages = [],
  isLoading: isPropLoading = false,
  onBack,
}) {
  const [showGallery, setShowGallery] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);

  // Paginated bi-directional message state
  const [loadedMessages, setLoadedMessages] = useState([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [hasMoreNewer, setHasMoreNewer] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isLoadingNewer, setIsLoadingNewer] = useState(false);

  const bottomRef = useRef(null);
  const searchInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const messageRefs = useRef({});

  const [triggerGetMessages] = useLazyGetMessagesQuery();
  const [triggerSearch, { isFetching: isSearching }] =
    useLazySearchMessagesQuery();

  // Active messages list (prefer internally loaded paginated messages, fallback to prop)
  const messages =
    loadedMessages.length > 0 ? loadedMessages : initialPropMessages;
  const isLoading =
    isLoadingInitial || (loadedMessages.length === 0 && isPropLoading);

  // Group active messages by date for sticky section headers
  const dateGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg) => {
      const dateKey = msg.sent_at
        ? new Date(msg.sent_at).toDateString()
        : "unknown";
      if (!currentGroup || currentGroup.dateKey !== dateKey) {
        currentGroup = {
          dateKey,
          firstSentAt: msg.sent_at,
          messages: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    });

    return groups;
  }, [messages]);

  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const userProfile = profileData?.profile;

  useEffect(() => {
    triggerGetProfile("", true);
  }, [triggerGetProfile]);

  // Precise isMe check supporting Arabic, Unicode symbols, tildes (~), and special brackets (【】)
  const checkIsMe = useCallback(
    (msgSenderName) => {
      if (!msgSenderName) return false;
      const cleanSender = cleanName(msgSenderName);
      const cleanParticipant = cleanName(activeConv?.participant_name);

      // 1. In 1-on-1 chats, if sender matches the participant name -> it is the recipient (isMe = false)
      if (
        cleanParticipant &&
        (cleanSender === cleanParticipant ||
          cleanSender.includes(cleanParticipant) ||
          cleanParticipant.includes(cleanSender))
      ) {
        return false;
      }

      // 2. In 1-on-1 chats, if sender is NOT the recipient -> it MUST be the user (isMe = true)
      if (!activeConv?.is_group) {
        return true;
      }

      // 3. For group chats, check against logged-in user profile username & owner_username
      const myUsername = cleanName(userProfile?.username);
      const myFullName = cleanName(userProfile?.full_name);
      const ownerUsername = cleanName(activeConv?.owner_username);

      if (myUsername && cleanSender === myUsername) return true;
      if (myFullName && cleanSender === myFullName) return true;
      if (ownerUsername && cleanSender === ownerUsername) return true;

      return false;
    },
    [
      userProfile?.username,
      userProfile?.full_name,
      activeConv?.owner_username,
      activeConv?.participant_name,
      activeConv?.is_group,
    ],
  );

  const [triggerGetMediaCount, { data: mediaCountData }] =
    useLazyGetMediaMessagesQuery();
  const mediaCount = mediaCountData?.totalCount || 0;

  useEffect(() => {
    if (activeConv?.id) {
      triggerGetMediaCount({ conversationId: activeConv.id, limit: 1 }, true);
    }
  }, [activeConv?.id, triggerGetMediaCount]);

  const isInitialLoadRef = useRef(true);

  // Initial load when active conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    if (!activeConv?.id) {
      setLoadedMessages([]);
      setHasMoreOlder(true);
      setHasMoreNewer(false);
      setTotalCount(0);
      return;
    }

    let isMounted = true;
    setIsLoadingInitial(true);
    setSearchQuery("");
    setSearchResults([]);
    setMatchIndex(0);
    setHighlightedMsgId(null);

    triggerGetMessages({ conversationId: activeConv.id, limit: 150 }, true)
      .unwrap()
      .then((res) => {
        if (!isMounted) return;
        setLoadedMessages(res.messages || []);
        setHasMoreOlder(res.hasMoreOlder ?? false);
        setHasMoreNewer(res.hasMoreNewer ?? false);
        setTotalCount(res.totalCount || (res.messages || []).length);
      })
      .catch((err) => {
        console.error("Error loading initial messages:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConv?.id, triggerGetMessages]);

  // Handle bi-directional infinite scrolling (Scroll Up -> Older, Scroll Down -> Newer)
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !activeConv?.id || loadedMessages.length === 0) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // 1. Scroll Up -> Fetch older messages
    if (scrollTop < 150 && hasMoreOlder && !isLoadingOlder) {
      const earliestMsg = loadedMessages[0];
      if (!earliestMsg?.sent_at) return;

      setIsLoadingOlder(true);
      prevScrollHeightRef.current = scrollHeight;

      triggerGetMessages(
        {
          conversationId: activeConv.id,
          beforeDate: earliestMsg.sent_at,
          limit: 100,
        },
        true,
      )
        .unwrap()
        .then((res) => {
          const newChunk = res.messages || [];
          if (newChunk.length > 0) {
            setLoadedMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const filteredNew = newChunk.filter(
                (m) => !existingIds.has(m.id),
              );
              return [...filteredNew, ...prev];
            });
            setHasMoreOlder(res.hasMoreOlder ?? newChunk.length === 100);
          } else {
            setHasMoreOlder(false);
          }
        })
        .catch((err) => console.error("Error loading older messages:", err))
        .finally(() => setIsLoadingOlder(false));
    }

    // 2. Scroll Down -> Fetch newer messages
    if (
      scrollHeight - scrollTop - clientHeight < 150 &&
      hasMoreNewer &&
      !isLoadingNewer
    ) {
      const latestMsg = loadedMessages[loadedMessages.length - 1];
      if (!latestMsg?.sent_at) return;

      setIsLoadingNewer(true);

      triggerGetMessages(
        {
          conversationId: activeConv.id,
          afterDate: latestMsg.sent_at,
          limit: 100,
        },
        true,
      )
        .unwrap()
        .then((res) => {
          const newChunk = res.messages || [];
          if (newChunk.length > 0) {
            setLoadedMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const filteredNew = newChunk.filter(
                (m) => !existingIds.has(m.id),
              );
              return [...prev, ...filteredNew];
            });
            setHasMoreNewer(res.hasMoreNewer ?? newChunk.length === 100);
          } else {
            setHasMoreNewer(false);
          }
        })
        .catch((err) => console.error("Error loading newer messages:", err))
        .finally(() => setIsLoadingNewer(false));
    }
  }, [
    activeConv?.id,
    loadedMessages,
    hasMoreOlder,
    hasMoreNewer,
    isLoadingOlder,
    isLoadingNewer,
    triggerGetMessages,
  ]);

  // Preserve scroll position synchronously when older messages are prepended
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container && prevScrollHeightRef.current > 0) {
      const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
      if (heightDiff > 0) {
        container.scrollTop = container.scrollTop + heightDiff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [loadedMessages]);

  // Auto-scroll to bottom ONCE on initial conversation load
  useEffect(() => {
    if (
      !showGallery &&
      !searchOpen &&
      loadedMessages.length > 0 &&
      isInitialLoadRef.current
    ) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isInitialLoadRef.current = false;
    }
  }, [loadedMessages, showGallery, searchOpen]);

  // Focus search input when search bar opens
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Debounced server search execution
  useEffect(() => {
    if (!searchQuery.trim() || !activeConv?.id) {
      setSearchResults([]);
      setMatchIndex(0);
      setHighlightedMsgId(null);
      return;
    }

    const timer = setTimeout(() => {
      triggerSearch({ conversationId: activeConv.id, query: searchQuery }, true)
        .unwrap()
        .then((res) => {
          const matches = res.matches || [];
          setSearchResults(matches);
          setMatchIndex(0);

          if (matches.length > 0) {
            jumpToMatch(matches[0]);
          } else {
            setHighlightedMsgId(null);
          }
        })
        .catch((err) => console.error("Search query error:", err));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeConv?.id, triggerSearch]);

  // Jump to specific match (loads context if message not currently in memory)
  const jumpToMatch = useCallback(
    (targetMatch) => {
      if (!targetMatch) return;
      setHighlightedMsgId(targetMatch.id);

      const isLoaded = loadedMessages.some((m) => m.id === targetMatch.id);

      if (isLoaded) {
        const el = messageRefs.current[targetMatch.id];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        // Fetch context surrounding target match
        setIsLoadingInitial(true);
        triggerGetMessages(
          {
            conversationId: activeConv.id,
            aroundId: targetMatch.id,
            limit: 150,
          },
          true,
        )
          .unwrap()
          .then((res) => {
            if (res.messages && res.messages.length > 0) {
              setLoadedMessages(res.messages);
              setHasMoreOlder(res.hasMoreOlder ?? true);
              setHasMoreNewer(res.hasMoreNewer ?? true);

              setTimeout(() => {
                const el = messageRefs.current[targetMatch.id];
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 100);
            }
          })
          .catch((err) => console.error("Error loading message context:", err))
          .finally(() => setIsLoadingInitial(false));
      }
    },
    [activeConv?.id, loadedMessages, triggerGetMessages],
  );

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = matchIndex < searchResults.length - 1 ? matchIndex + 1 : 0;
    setMatchIndex(nextIdx);
    jumpToMatch(searchResults[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = matchIndex > 0 ? matchIndex - 1 : searchResults.length - 1;
    setMatchIndex(prevIdx);
    jumpToMatch(searchResults[prevIdx]);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setMatchIndex(0);
    setHighlightedMsgId(null);
  };

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col bg-[#0d0d0d]">
        <EmptyChatState />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d0d0d] relative overflow-hidden min-w-0">
      {/* ── Top Header ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1f1f1f] bg-[#0d0d0d] flex-shrink-0 z-10">
        {/* Mobile Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors -ml-1 mr-1 flex-shrink-0"
            title="Back to conversations"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-ig-primary flex items-center justify-center font-bold text-white text-base uppercase flex-shrink-0">
          {activeConv.participant_name.charAt(0)}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-white truncate leading-tight">
            {activeConv.participant_name}
          </h3>
          <span className="text-[11px] text-gray-500">
            {totalCount > 0
              ? `${totalCount.toLocaleString()} messages`
              : "Instagram Archive"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* In-chat search button */}
          <button
            onClick={() => setShowSearchOverlay(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
              showSearchOverlay
                ? "bg-ig-primary/20 text-ig-primary"
                : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
            }`}
            title="Search in conversation"
          >
            <Search size={17} />
          </button>

          {/* Media gallery button */}
          <button
            onClick={() => setShowGallery((v) => !v)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-colors border ${
              showGallery
                ? "bg-ig-primary/20 border-ig-primary/40 text-ig-primary"
                : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#3a3a3a]"
            }`}
            title="View shared media"
          >
            <Images size={15} />
            <span>Media</span>
            {mediaCount > 0 && (
              <span className="text-ig-primary text-[10px] font-bold w-4 h-4 flex items-center justify-center leading-none">
                {mediaCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Server Search Bar ── */}
      {searchOpen && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#111] border-b border-[#1f1f1f] flex-shrink-0">
          <Search size={14} className="text-gray-500 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all historical messages…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />

          {isSearching ? (
            <Loader2
              size={15}
              className="animate-spin text-ig-primary flex-shrink-0"
            />
          ) : searchQuery ? (
            <>
              <span className="text-[11px] text-gray-400 flex-shrink-0">
                {searchResults.length > 0
                  ? `${matchIndex + 1} of ${searchResults.length}`
                  : "No matches"}
              </span>
              <button
                onClick={handlePrevMatch}
                className="text-gray-400 hover:text-white disabled:opacity-30"
                disabled={searchResults.length === 0}
                title="Previous match"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={handleNextMatch}
                className="text-gray-400 hover:text-white disabled:opacity-30"
                disabled={searchResults.length === 0}
                title="Next match"
              >
                <ChevronDown size={16} />
              </button>
            </>
          ) : null}

          <button
            onClick={handleSearchClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Messages area ── */}
      {isLoading ? (
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-48 rounded-2xl" />
          <Skeleton className="h-14 w-64 rounded-2xl ml-auto" />
          <Skeleton className="h-10 w-52 rounded-2xl" />
          <Skeleton className="h-10 w-64 rounded-2xl ml-auto" />
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        >
          {/* Top indicator: Older messages loading / status */}
          {isLoadingOlder ? (
            <div className="flex justify-center py-2">
              <span className="flex items-center gap-2 text-[11px] text-gray-400 bg-[#161616] px-3 py-1.5 rounded-full border border-[#262626]">
                <Loader2 size={13} className="animate-spin text-ig-primary" />
                Loading older messages…
              </span>
            </div>
          ) : hasMoreOlder ? (
            <div className="text-center py-2">
              <span className="text-[10px] text-gray-500 bg-[#161616] px-2.5 py-1 rounded-full border border-[#262626]">
                Scroll up to load older messages ({messages.length} loaded)
              </span>
            </div>
          ) : messages.length > 0 ? (
            <div className="text-center py-2">
              <span className="text-[10px] text-gray-600">
                Beginning of conversation history
              </span>
            </div>
          ) : null}

          {/* Render message list grouped by date for true sticky headers */}
          {dateGroups.map((group) => (
            <div key={group.dateKey} className="relative space-y-3">
              <div className="sticky top-2 z-20 flex justify-center py-1.5 pointer-events-none">
                <span className="text-[11px] font-semibold text-gray-200 bg-[#161616]/95 backdrop-blur-md border border-[#2a2a2a] px-3.5 py-1 rounded-full shadow-md pointer-events-auto">
                  {formatDateSeparator(group.firstSentAt)}
                </span>
              </div>

              {group.messages.map((msg) => {
                const isMe = checkIsMe(msg.sender_name);

                const isHighlighted = highlightedMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) messageRefs.current[msg.id] = el;
                    }}
                    className={`transition-colors duration-500 ${
                      isHighlighted
                        ? "bg-ig-primary/10 rounded-2xl p-1 border border-ig-primary/30"
                        : ""
                    }`}
                  >
                    <MessageBubble
                      message={msg}
                      isMe={isMe}
                      highlight={searchQuery || undefined}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Bottom indicator: Newer messages loading / status when jumped to history */}
          {isLoadingNewer ? (
            <div className="flex justify-center py-2">
              <span className="flex items-center gap-2 text-[11px] text-gray-400 bg-[#161616] px-3 py-1.5 rounded-full border border-[#262626]">
                <Loader2 size={13} className="animate-spin text-ig-primary" />
                Loading newer messages…
              </span>
            </div>
          ) : hasMoreNewer ? (
            <div className="text-center py-2">
              <span className="text-[10px] text-gray-500 bg-[#161616] px-2.5 py-1 rounded-full border border-[#262626]">
                Scroll down to load newer messages
              </span>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Media gallery overlay ── */}
      {showGallery && (
        <ChatMediaGallery
          conversationId={activeConv.id}
          participantName={activeConv.participant_name}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* ── Full pane search overlay ── */}
      {showSearchOverlay && (
        <ChatSearchOverlay
          conversationId={activeConv.id}
          participantName={activeConv.participant_name}
          ownerUsername={activeConv.owner_username}
          onSelectMessage={(msg) => {
            setShowSearchOverlay(false);
            jumpToMatch(msg);
          }}
          onClose={() => setShowSearchOverlay(false)}
        />
      )}
    </div>
  );
}
