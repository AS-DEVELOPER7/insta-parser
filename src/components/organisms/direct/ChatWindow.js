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
  ArrowLeft,
  Loader2,
  Star,
} from "lucide-react";
import ChatMediaGallery from "@/components/organisms/direct/ChatMediaGallery";
import ChatSearchOverlay from "@/components/organisms/direct/ChatSearchOverlay";
import ChatStarredDrawer from "@/components/organisms/direct/ChatStarredDrawer";
import MediaLightboxModal from "@/components/molecules/media/MediaLightboxModal";
import MessageBubble from "@/components/molecules/MessageBubble";
import EmptyChatState from "@/components/molecules/direct/EmptyChatState";
import Skeleton from "@/components/atoms/Skeleton";
import {
  useLazyGetMessagesQuery,
  useLazyGetProfileQuery,
  useLazyGetMediaMessagesQuery,
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "@/store/api/apiSlice";
import { PAGINATION_LIMITS } from "@/constants/config";

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

function scrollToElementInContainer(container, el, { behavior = "smooth", block = "center" } = {}) {
  if (!container || !el) return;
  const containerRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const relativeTop = elRect.top - containerRect.top + container.scrollTop;
  let targetScrollTop = relativeTop;
  if (block === "center") {
    targetScrollTop = relativeTop - (container.clientHeight / 2) + (el.clientHeight / 2);
  } else if (block === "end") {
    targetScrollTop = relativeTop - container.clientHeight + el.clientHeight;
  }
  container.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior,
  });
}

export default function ChatWindow({
  activeConv,
  messages: initialPropMessages = [],
  isLoading: isPropLoading = false,
  onBack,
  initialTargetMessageId,
}) {
  const [showGallery, setShowGallery] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showStarredDrawer, setShowStarredDrawer] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);

  // Favorites data for current active conversation
  const { data: favoritesData } = useGetFavoritesQuery(
    { conversationId: activeConv?.id },
    { skip: !activeConv?.id }
  );
  const favoriteMessageIds = useMemo(
    () => new Set(favoritesData?.favoriteMessageIds || []),
    [favoritesData]
  );
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();

  const handleToggleFavorite = useCallback(
    async (msg) => {
      if (!msg?.id || !activeConv?.id) return;
      const isFav = favoriteMessageIds.has(msg.id);
      try {
        if (isFav) {
          await removeFavorite({ messageId: msg.id }).unwrap();
        } else {
          await addFavorite({
            messageId: msg.id,
            conversationId: activeConv.id,
            tag: 'General',
          }).unwrap();
        }
      } catch (err) {
        console.error('Error toggling favorite:', err);
      }
    },
    [activeConv?.id, favoriteMessageIds, addFavorite, removeFavorite]
  );

  // Paginated bi-directional message state
  const [loadedMessages, setLoadedMessages] = useState([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [hasMoreNewer, setHasMoreNewer] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isLoadingNewer, setIsLoadingNewer] = useState(false);

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const messageRefs = useRef({});

  const [triggerGetMessages] = useLazyGetMessagesQuery();

  // Active messages list for current conversation (strictly loadedMessages)
  const messages = loadedMessages;
  const isLoading =
    isLoadingInitial || (loadedMessages.length === 0 && isPropLoading);

  // Group active messages by date for sticky section headers
  const dateGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    // Deduplicate messages by ID and content signature before rendering
    const seenIds = new Set();
    const seenFp = new Set();
    const cleanMsgs = [];

    for (const msg of messages) {
      if (!msg) continue;
      const idKey = msg.id || `${msg.sender_name}_${msg.sent_at}_${msg.content}`;
      const timeMs = msg.sent_at ? new Date(msg.sent_at).getTime() : 0;
      const sec = Math.floor(timeMs / 1000);
      const fpKey = `${msg.sender_name}_${sec}_${(msg.content || '').trim().toLowerCase()}_${msg.media_url || msg.share_url || ''}`;

      if (!seenIds.has(idKey) && !seenFp.has(fpKey)) {
        seenIds.add(idKey);
        seenFp.add(fpKey);
        cleanMsgs.push(msg);
      }
    }

    cleanMsgs.forEach((msg) => {
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

  const [loadError, setLoadError] = useState(null);

  // Initial load when active conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    setLoadedMessages([]);
    setLoadError(null);

    if (!activeConv?.id) {
      setHasMoreOlder(true);
      setHasMoreNewer(false);
      setTotalCount(0);
      setIsLoadingInitial(false);
      return;
    }

    let isMounted = true;
    setIsLoadingInitial(true);
    setSearchQuery("");
    setHighlightedMsgId(null);

    triggerGetMessages(
      {
        conversationId: activeConv.id,
        limit: PAGINATION_LIMITS.MESSAGES_DEFAULT,
      },
      true,
    )
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
        if (isMounted) {
          setLoadError(err?.data?.error || err?.message || "Failed to load messages");
          setLoadedMessages([]);
        }
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
          limit: PAGINATION_LIMITS.MESSAGES_SCROLL_UP,
        },
        true,
      )
        .unwrap()
        .then((res) => {
          const newChunk = res.messages || [];
          if (newChunk.length > 0) {
            setLoadedMessages((prev) => {
              const combined = [...newChunk, ...prev];
              const seenIds = new Set();
              const seenFp = new Set();
              const unique = [];
              for (const m of combined) {
                if (!m || !m.id) continue;
                const timeMs = m.sent_at ? new Date(m.sent_at).getTime() : 0;
                const sec = Math.floor(timeMs / 1000);
                const fp = `${m.sender_name}_${sec}_${(m.content || '').trim().toLowerCase()}_${m.media_url || m.share_url || ''}`;
                if (!seenIds.has(m.id) && !seenFp.has(fp)) {
                  seenIds.add(m.id);
                  seenFp.add(fp);
                  unique.push(m);
                }
              }
              unique.sort((a, b) => {
                const tA = new Date(a.sent_at).getTime();
                const tB = new Date(b.sent_at).getTime();
                if (tA !== tB) return tA - tB;
                return (a.id || '').localeCompare(b.id || '');
              });
              return unique;
            });
            setHasMoreOlder(res.hasMoreOlder ?? true);
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
          limit: PAGINATION_LIMITS.MESSAGES_SCROLL_DOWN,
        },
        true,
      )
        .unwrap()
        .then((res) => {
          const newChunk = res.messages || [];
          if (newChunk.length > 0) {
            setLoadedMessages((prev) => {
              const combined = [...prev, ...newChunk];
              const seenIds = new Set();
              const seenFp = new Set();
              const unique = [];
              for (const m of combined) {
                if (!m || !m.id) continue;
                const timeMs = m.sent_at ? new Date(m.sent_at).getTime() : 0;
                const sec = Math.floor(timeMs / 1000);
                const fp = `${m.sender_name}_${sec}_${(m.content || '').trim().toLowerCase()}_${m.media_url || m.share_url || ''}`;
                if (!seenIds.has(m.id) && !seenFp.has(fp)) {
                  seenIds.add(m.id);
                  seenFp.add(fp);
                  unique.push(m);
                }
              }
              unique.sort((a, b) => {
                const tA = new Date(a.sent_at).getTime();
                const tB = new Date(b.sent_at).getTime();
                if (tA !== tB) return tA - tB;
                return (a.id || '').localeCompare(b.id || '');
              });
              return unique;
            });
            setHasMoreNewer(res.hasMoreNewer ?? true);
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

  // Reset any global window scroll and panels when active conversation changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    setShowSearchOverlay(false);
    setShowGallery(false);
    setShowStarredDrawer(false);
    setSearchQuery("");
    setHighlightedMsgId(null);
  }, [activeConv?.id]);

  // Auto-scroll to bottom ONCE on initial conversation load (strictly inside scroll container)
  useEffect(() => {
    if (
      !showGallery &&
      !showSearchOverlay &&
      loadedMessages.length > 0 &&
      isInitialLoadRef.current
    ) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "auto",
        });
      }
      isInitialLoadRef.current = false;
    }
  }, [loadedMessages, showGallery, showSearchOverlay]);

  // Jump to specific match (strictly within container, never scrolls the window or header)
  const jumpToMatch = useCallback(
    (targetMatch) => {
      if (!targetMatch) return;
      setHighlightedMsgId(targetMatch.id);

      const isLoaded = loadedMessages.some((m) => m.id === targetMatch.id);

      if (isLoaded) {
        const el = messageRefs.current[targetMatch.id];
        if (el && scrollContainerRef.current) {
          scrollToElementInContainer(scrollContainerRef.current, el, {
            behavior: "smooth",
            block: "center",
          });
        }
      } else {
        // Fetch context surrounding target match
        setIsLoadingInitial(true);
        triggerGetMessages(
          {
            conversationId: activeConv.id,
            aroundId: targetMatch.id,
            limit: PAGINATION_LIMITS.MESSAGES_SEARCH_WINDOW,
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
                if (el && scrollContainerRef.current) {
                  scrollToElementInContainer(scrollContainerRef.current, el, {
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }, 100);
            }
          })
          .catch((err) => console.error("Error loading message context:", err))
          .finally(() => setIsLoadingInitial(false));
      }
    },
    [activeConv?.id, loadedMessages, triggerGetMessages],
  );

  // Jump to specific message on initial load if targeted from Saved Messages view
  useEffect(() => {
    if (initialTargetMessageId && activeConv?.id) {
      jumpToMatch({ id: initialTargetMessageId });
    }
  }, [initialTargetMessageId, activeConv?.id, jumpToMatch]);

  // Gently clear message highlight and searched query after 4 seconds
  useEffect(() => {
    if (!highlightedMsgId) return;
    const timer = setTimeout(() => {
      setHighlightedMsgId(null);
      setSearchQuery("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [highlightedMsgId]);

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0d0d0d]">
        <EmptyChatState />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#000000] relative overflow-hidden min-w-0 h-full">
      {/* ── Sticky Top Header & Pinned Search Area ── */}
      <div className="sticky top-0 z-20 flex-shrink-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#222222] shadow-sm">
        {/* Top Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
          {/* Mobile Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors -ml-1 mr-0.5 flex-shrink-0"
              title="Back to conversations"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-0.5 flex-shrink-0 shadow-sm">
            <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center font-bold text-gray-900 dark:text-white text-sm uppercase">
              {activeConv.participant_name.charAt(0)}
            </div>
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate leading-tight">
              {activeConv.participant_name}
            </h3>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {totalCount > 0
                ? `${totalCount.toLocaleString()} messages`
                : "Instagram Archive"}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* In-chat search toggle (opens full search view directly) */}
            <button
              onClick={() => setShowSearchOverlay((prev) => !prev)}
              className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors ${
                showSearchOverlay
                  ? "bg-ig-primary/20 text-ig-primary"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
              }`}
              title="Search in conversation"
              aria-label="Search in conversation"
            >
              <Search size={18} />
            </button>

            {/* Starred messages drawer toggle */}
            <button
              onClick={() => setShowStarredDrawer(true)}
              className={`flex items-center gap-1.5 px-3 h-10 min-h-[40px] rounded-xl text-xs font-semibold transition-colors border ${
                showStarredDrawer || (favoritesData?.count > 0)
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                  : "bg-gray-100 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#3a3a3a]"
              }`}
              title="Starred messages in this chat"
              aria-label="Starred messages in this chat"
            >
              <Star
                size={15}
                className={favoritesData?.count > 0 ? "fill-amber-400 text-amber-500" : ""}
              />
              <span className="hidden sm:inline">Starred</span>
              {favoritesData?.count > 0 && (
                <span className="text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 leading-none">
                  {favoritesData.count}
                </span>
              )}
            </button>

            {/* Media gallery button */}
            <button
              onClick={() => setShowGallery((v) => !v)}
              className={`flex items-center gap-1.5 px-3 h-10 min-h-[40px] rounded-xl text-xs font-semibold transition-colors border ${
                showGallery
                  ? "bg-ig-primary/20 border-ig-primary/40 text-ig-primary"
                  : "bg-gray-100 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#3a3a3a]"
              }`}
              title="View shared media"
            >
              <Images size={16} />
              <span className="hidden sm:inline">Media</span>
              {mediaCount > 0 && (
                <span className="text-ig-primary text-[10px] font-bold w-4 h-4 flex items-center justify-center leading-none">
                  {mediaCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages area ── */}
      {isLoading ? (
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-48 rounded-2xl" />
          <Skeleton className="h-14 w-64 rounded-2xl ml-auto" />
          <Skeleton className="h-10 w-52 rounded-2xl" />
          <Skeleton className="h-10 w-64 rounded-2xl ml-auto" />
        </div>
      ) : loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
            <X size={24} />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Failed to load conversation</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{loadError}</p>
          <button
            onClick={() => {
              setLoadError(null);
              setIsLoadingInitial(true);
              triggerGetMessages(
                { conversationId: activeConv.id, limit: PAGINATION_LIMITS.MESSAGES_DEFAULT },
                true
              )
                .unwrap()
                .then((res) => {
                  setLoadedMessages(res.messages || []);
                  setHasMoreOlder(res.hasMoreOlder ?? false);
                })
                .catch((e) => setLoadError(e?.data?.error || 'Failed to load messages'))
                .finally(() => setIsLoadingInitial(false));
            }}
            className="mt-4 px-4 py-2 bg-gray-200 dark:bg-[#222] hover:bg-gray-300 dark:hover:bg-[#333] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Retry Loading
          </button>
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
              <span className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#161616] px-3 py-1.5 rounded-full border border-gray-200 dark:border-[#262626]">
                <Loader2 size={13} className="animate-spin text-ig-primary" />
                Loading older messages…
              </span>
            </div>
          ) : hasMoreOlder ? (
            <div className="text-center py-2">
              <span className="text-[10px] text-gray-600 dark:text-gray-500 bg-gray-100 dark:bg-[#161616] px-2.5 py-1 rounded-full border border-gray-200 dark:border-[#262626]">
                Scroll up to load older messages ({messages.length} loaded)
              </span>
            </div>
          ) : messages.length > 0 ? (
            <div className="text-center py-2">
              <span className="text-[10px] text-gray-500 dark:text-gray-600">
                Beginning of conversation history
              </span>
            </div>
          ) : null}

          {/* Render message list grouped by date for true sticky headers */}
          {dateGroups.map((group) => (
            <div key={group.dateKey} className="relative space-y-3">
              <div className="sticky top-2 z-20 flex justify-center py-1.5 pointer-events-none">
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 bg-white/95 dark:bg-[#161616]/95 backdrop-blur-md border border-gray-200 dark:border-[#2a2a2a] px-3.5 py-1 rounded-full shadow-sm pointer-events-auto">
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
                      isFavorite={favoriteMessageIds.has(msg.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onMediaClick={(lightboxData) => setLightbox(lightboxData)}
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
          onSelectMessage={(msg, query) => {
            setShowSearchOverlay(false);
            if (query) setSearchQuery(query);
            jumpToMatch(msg);
          }}
          onClose={() => setShowSearchOverlay(false)}
        />
      )}

      {/* ── Starred messages drawer overlay ── */}
      {showStarredDrawer && (
        <ChatStarredDrawer
          conversationId={activeConv.id}
          participantName={activeConv.participant_name}
          onSelectMessage={(msg) => {
            setShowStarredDrawer(false);
            jumpToMatch(msg);
          }}
          onClose={() => setShowStarredDrawer(false)}
        />
      )}
      {/* ── Lightbox Modal for direct media preview ── */}
      <MediaLightboxModal lightbox={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
