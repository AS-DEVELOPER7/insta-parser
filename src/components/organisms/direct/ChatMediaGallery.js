"use client";

import Image from "next/image";
import {
  X,
  Images,
  ArrowLeft,
  ExternalLink,
  Play,
  Loader2,
  Volume2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLazyGetMediaMessagesQuery } from "@/store/api/apiSlice";

export default function ChatMediaGallery({
  conversationId,
  participantName,
  onClose,
}) {
  const [lightbox, setLightbox] = useState(null);
  const [filter, setFilter] = useState("all");

  const [mediaItems, setMediaItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    all: 0,
    image: 0,
    video: 0,
    audio: 0,
    reel: 0,
    link: 0,
  });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [triggerGetMedia] = useLazyGetMediaMessagesQuery();

  // Fetch initial batch when conversationId or filter changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingInitial(true);
    setMediaItems([]);
    setOffset(0);
    setHasMore(true);

    triggerGetMedia(
      { conversationId, type: filter, limit: 20, offset: 0 },
      true,
    )
      .unwrap()
      .then((data) => {
        if (!isMounted) return;
        const newItems = data.mediaMessages || [];
        setMediaItems(newItems);
        setTotalCount(data.totalCount || 0);
        if (data.counts) setCounts(data.counts);
        setOffset(data.nextOffset || newItems.length);
        setHasMore(data.hasMore ?? false);
      })
      .catch((err) => console.error("Failed to load chat media:", err))
      .finally(() => {
        if (isMounted) setIsLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [conversationId, filter, triggerGetMedia]);

  // Load next batch when scrolling down
  const handleScroll = useCallback(
    (e) => {
      if (isLoadingMore || !hasMore || isLoadingInitial) return;

      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        setIsLoadingMore(true);

        triggerGetMedia(
          { conversationId, type: filter, limit: 20, offset },
          true,
        )
          .unwrap()
          .then((data) => {
            const newItems = data.mediaMessages || [];
            if (newItems.length > 0) {
              setMediaItems((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const filteredNew = newItems.filter(
                  (m) => !existingIds.has(m.id),
                );
                return [...prev, ...filteredNew];
              });
              setOffset(data.nextOffset);
              setHasMore(data.hasMore);
            } else {
              setHasMore(false);
            }
          })
          .catch((err) => console.error("Failed to load more chat media:", err))
          .finally(() => setIsLoadingMore(false));
      }
    },
    [
      conversationId,
      filter,
      offset,
      hasMore,
      isLoadingMore,
      isLoadingInitial,
      triggerGetMedia,
    ],
  );

  return (
    <div className="absolute inset-0 z-20 flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f] bg-[#121212]">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-[#222] transition-colors"
            title="Back to chat"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Images size={16} className="text-ig-primary" />
              <span>Shared Media & Links</span>
            </h3>
            <p className="text-[11px] text-gray-400">
              {participantName} · {totalCount.toLocaleString()} items
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-[#222] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[#1f1f1f] bg-[#090909] flex-shrink-0 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All", count: counts.all },
          { id: "image", label: "Images", count: counts.image },
          { id: "video", label: "Videos", count: counts.video },
          { id: "audio", label: "Audio", count: counts.audio },
          { id: "reel", label: "Reels", count: counts.reel },
          { id: "link", label: "Links", count: counts.link },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1.5 ${
              filter === t.id
                ? "bg-ig-primary text-white shadow-sm font-semibold"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#262626]"
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filter === t.id
                  ? "bg-white/20 text-white"
                  : "bg-[#282828] text-gray-400"
              }`}
            >
              {t.count || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Gallery grid */}
      <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
        {isLoadingInitial ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
            <Loader2 size={24} className="animate-spin text-ig-primary" />
            <span className="text-xs">Loading media gallery…</span>
          </div>
        ) : mediaItems.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {mediaItems.map((msg) => {
                const url = msg.media_url || msg.share_url;
                const isAudio =
                  url?.includes("/audio/") ||
                  url?.match(/\.(m4a|mp3|ogg|wav)/i) ||
                  msg.media_type === "audio" ||
                  msg.media_type === "voice_note";
                const isVid =
                  !isAudio &&
                  (url?.match(/\.(mp4|mov|webm)/i) ||
                    msg.media_type === "video" ||
                    url?.includes("/reel/"));
                const isExternalLink = !msg.media_url && msg.share_url;

                return (
                  <button
                    key={msg.id}
                    onClick={() =>
                      setLightbox({
                        url,
                        isAudio,
                        isVid,
                        isExternalLink,
                        shareText: msg.share_text,
                        sender: msg.sender_name,
                      })
                    }
                    className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] group border border-[#262626] hover:border-ig-primary/60 transition-all flex flex-col items-center justify-center p-2 text-left"
                  >
                    {msg.media_url ? (
                      isAudio ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-[#1e1b2e] to-[#0a0a0a] rounded-lg">
                          <Volume2 size={18} className="text-ig-primary mb-1" />
                          <span className="text-[9px] text-gray-300 font-semibold truncate w-full">
                            Audio
                          </span>
                        </div>
                      ) : isVid ? (
                        <video
                          src={msg.media_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <Image
                          src={msg.media_url}
                          alt="Chat media"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0a] text-center">
                        <div className="w-8 h-8 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center mb-1">
                          {isVid ? (
                            <Play size={14} className="fill-current" />
                          ) : (
                            <ExternalLink size={14} />
                          )}
                        </div>
                        <span className="text-[10px] text-gray-300 font-medium line-clamp-2 leading-tight">
                          {msg.share_text || "Shared Link"}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                    {isVid && msg.media_url && (
                      <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white rounded-full p-1">
                        <Play size={10} className="fill-current" />
                      </div>
                    )}

                    {isAudio && msg.media_url && (
                      <div className="absolute bottom-1.5 right-1.5 bg-purple-600/90 text-white rounded-full p-1">
                        <Volume2 size={10} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pagination loader */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <span className="flex items-center gap-2 text-[11px] text-gray-400 bg-[#161616] px-3 py-1.5 rounded-full border border-[#262626]">
                  <Loader2 size={13} className="animate-spin text-ig-primary" />
                  Loading more media…
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500 text-center px-4">
            <Images size={32} className="text-gray-600 mb-1" />
            <p className="text-xs font-medium text-gray-400">
              No media found in this category
            </p>
            <p className="text-[11px] text-gray-500">
              Photos, videos, audio notes, and links shared in this conversation
              will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="absolute inset-0 z-30 bg-black/95 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl max-h-[85vh] w-full flex items-center justify-center"
          >
            {lightbox.isAudio ? (
              <div className="bg-[#1a1a1a] border border-[#333] p-8 rounded-2xl max-w-md w-full text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center mx-auto shadow-lg">
                  <Volume2 size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">
                    Voice Note / Audio Message
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Sent by {lightbox.sender || "User"}
                  </p>
                </div>
                <audio
                  src={lightbox.url}
                  controls
                  autoPlay
                  className="w-full rounded-xl"
                />
              </div>
            ) : lightbox.isExternalLink ? (
              <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-2xl max-w-md w-full text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center mx-auto">
                  <ExternalLink size={24} />
                </div>
                <h4 className="font-bold text-white text-base">
                  Shared Link / Post
                </h4>
                {lightbox.shareText && (
                  <p className="text-xs text-gray-300 leading-relaxed max-h-32 overflow-y-auto">
                    {lightbox.shareText}
                  </p>
                )}
                <a
                  href={lightbox.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ig-primary text-white text-sm font-semibold hover:bg-ig-primary/90 transition-colors"
                >
                  <span>Open Link</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : lightbox.isVid ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={lightbox.url}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
