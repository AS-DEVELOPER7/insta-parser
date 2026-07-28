"use client";

import { useState, useEffect, useCallback } from "react";
import MainLayoutTemplate from "@/components/templates/MainLayoutTemplate";
import MediaVaultGrid from "@/components/organisms/media/MediaVaultGrid";
import {
  useLazyGetProfileQuery,
  useLazyGetMediaVaultQuery,
} from "@/store/api/apiSlice";

export default function MediaVaultPage() {
  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const [triggerGetMedia, { isLoading: isLoadingQuery }] =
    useLazyGetMediaVaultQuery();

  const userProfile = profileData?.profile;

  const [mediaItems, setMediaItems] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    photos: 0,
    videos: 0,
    audio: 0,
    reels: 0,
    links: 0,
  });
  const [filter, setFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    triggerGetProfile("", true);
  }, [triggerGetProfile]);

  // Fetch initial batch of 30 media items when filter changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingInitial(true);
    setMediaItems([]);
    setOffset(0);
    setHasMore(true);

    triggerGetMedia({ filter, limit: 30, offset: 0 }, true)
      .unwrap()
      .then((data) => {
        if (!isMounted) return;
        setMediaItems(data.media || []);
        if (data.counts) setCounts(data.counts);
        setOffset(data.nextOffset || (data.media || []).length);
        setHasMore(data.hasMore ?? false);
      })
      .catch((err) => console.error("Error loading media vault:", err))
      .finally(() => {
        if (isMounted) setIsLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filter, triggerGetMedia]);

  // Load next page of 30 items on scroll
  const handleScroll = useCallback(() => {
    if (isLoadingMore || !hasMore || isLoadingInitial) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 300) {
      setIsLoadingMore(true);

      triggerGetMedia({ filter, limit: 30, offset })
        .unwrap()
        .then((data) => {
          const newItems = data.media || [];
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
        .catch((err) => console.error("Error fetching more media:", err))
        .finally(() => setIsLoadingMore(false));
    }
  }, [
    filter,
    offset,
    hasMore,
    isLoadingMore,
    isLoadingInitial,
    triggerGetMedia,
  ]);

  // Attach global scroll listener for window
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <MainLayoutTemplate userProfile={userProfile}>
      <MediaVaultGrid
        mediaItems={mediaItems}
        counts={counts}
        filter={filter}
        onFilterChange={setFilter}
        isLoadingInitial={isLoadingInitial}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        lightbox={lightbox}
        setLightbox={setLightbox}
      />
    </MainLayoutTemplate>
  );
}
