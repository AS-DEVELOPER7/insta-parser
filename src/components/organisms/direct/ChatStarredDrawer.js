"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Star,
  Search,
  X,
  Loader2,
  Trash2,
  Tag,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Play,
  Volume2,
} from "lucide-react";
import {
  useGetFavoritesQuery,
  useRemoveFavoriteMutation,
  useUpdateFavoriteMutation,
} from "@/store/api/apiSlice";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const dateFormatted = d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatted = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateFormatted}, ${timeFormatted}`;
}

export default function ChatStarredDrawer({
  conversationId,
  participantName,
  onSelectMessage,
  onClose,
}) {
  const [selectedTag, setSelectedTag] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useGetFavoritesQuery({ conversationId });
  const [removeFavorite] = useRemoveFavoriteMutation();
  const [updateFavorite] = useUpdateFavoriteMutation();

  const favorites = data?.favorites || [];
  const tags = ["All", ...(data?.tags || []).filter((t) => t !== "All")];

  const filteredFavorites = favorites.filter((fav) => {
    const matchesTag = selectedTag === "All" || fav.tag === selectedTag;
    if (!matchesTag) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const contentMatch = fav.message?.content?.toLowerCase().includes(q);
    const senderMatch = fav.message?.sender_name?.toLowerCase().includes(q);
    const noteMatch = fav.note?.toLowerCase().includes(q);
    return contentMatch || senderMatch || noteMatch;
  });

  const [removingId, setRemovingId] = useState(null);

  const handleRemove = async (e, messageId) => {
    e.stopPropagation();
    setRemovingId(messageId);
    try {
      await removeFavorite({ messageId }).unwrap();
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-[#000000] transition-colors duration-200">
      {/* ── Top Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#222222] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors flex-shrink-0"
          title="Back to conversation"
          aria-label="Back to conversation"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Star size={16} className="fill-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              Starred Messages
            </h3>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
              with {participantName} • {favorites.length} saved
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Deck ── */}
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-[#222222] flex flex-col gap-2 flex-shrink-0">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#161616] rounded-xl border border-gray-200 dark:border-[#282828] focus-within:border-ig-primary/60 transition-colors">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within starred messages..."
            className="flex-1 bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tag Filter Pills */}
        {tags.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  selectedTag === tag
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#282828] hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Starred Messages List ── */}
      <div className="flex-1 overflow-y-auto  p-2 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500">
            <Loader2 size={24} className="animate-spin text-amber-500" />
            <span className="text-xs">Loading starred messages...</span>
          </div>
        ) : filteredFavorites.length > 0 ? (
          filteredFavorites.map((fav) => {
            const msg = fav.message;
            if (!msg) return null;

            return (
              <div
                key={fav.id}
                onClick={() => onSelectMessage(msg)}
                className="group p-2 rounded-2xl bg-gray-50 dark:bg-[#121212] border  border-gray-200 dark:border-[#252525] transition-all cursor-pointer flex flex-col gap-2 relative shadow-none hover:shadow-sm"
              >
                {/* Meta row: Sender, Tag, Date, Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                      {msg.sender_name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Tag size={10} />
                      {fav.tag || "General"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {formatDate(msg.sent_at)}
                    </span>
                    <button
                      onClick={(e) => handleRemove(e, msg.id)}
                      disabled={removingId === msg.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-50"
                      title="Unstar message"
                      aria-label="Unstar message"
                    >
                      {removingId === msg.id ? (
                        <Loader2
                          size={13}
                          className="animate-spin text-red-500"
                        />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                {msg.content &&
                  !/^\s*.*?\bsent an attachment\.\s*$/i.test(msg.content) && (
                    <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed break-words font-normal">
                      {msg.content}
                    </p>
                  )}

                {/* Shared Reel / Post link if present */}
                {msg.share_url && (
                  <a
                    href={msg.share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline max-w-fit transition-colors mt-0.5"
                  >
                    <Play size={11} className="fill-current flex-shrink-0" />
                    <span>
                      {msg.share_url.includes("/reel")
                        ? "Instagram Reel"
                        : "Shared Post"}
                    </span>
                    <ExternalLink size={10} className="flex-shrink-0" />
                  </a>
                )}

                {/* Media preview (Image / Video / Audio) */}
                {msg.media_url && (
                  <div className="mt-1">
                    {msg.media_url.match(/\.(mp4|mov|webm)/i) ||
                    msg.media_type === "video" ? (
                      <div className="relative rounded-xl overflow-hidden max-w-[220px] max-h-40 bg-black border border-gray-200 dark:border-[#282828]">
                        <video
                          src={msg.media_url}
                          controls
                          className="rounded-xl max-h-40 w-auto object-cover"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : msg.media_url.match(/\.(m4a|mp3|ogg|wav)/i) ||
                      msg.media_type === "audio" ? (
                      <div className="p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center gap-2 max-w-xs">
                        <Volume2
                          size={14}
                          className="text-ig-primary flex-shrink-0"
                        />
                        <audio
                          src={msg.media_url}
                          controls
                          className="w-full h-7"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden max-w-[200px] max-h-40 border border-gray-200 dark:border-[#282828] bg-gray-100 dark:bg-[#181818] shadow-sm">
                        <img
                          src={msg.media_url}
                          alt="Attached media"
                          className="rounded-xl max-h-40 w-auto object-cover hover:opacity-95 transition-opacity"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Personal note if present */}
                {fav.note && (
                  <div className="text-[11px] italic text-gray-500 bg-gray-100 dark:bg-[#181818] px-2.5 py-1 rounded-lg">
                    Note: {fav.note}
                  </div>
                )}

                {/* Jump link hint */}
                <div className="flex items-center justify-end text-[10px] font-medium text-amber-500  transition-opacity">
                  <span>Click to jump in conversation →</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <Star size={28} className="fill-amber-400/30" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {searchQuery || selectedTag !== "All"
                ? "No matching starred messages"
                : "No starred messages yet"}
            </h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              {searchQuery || selectedTag !== "All"
                ? "Try clearing your search or selecting another tag."
                : "Hover over any message in this conversation and click the star icon to save it here for instant access."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
