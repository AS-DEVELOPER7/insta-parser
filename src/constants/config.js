/**
 * Centralized Application Configurations & Constants
 * Used across client pages, API routes, authentication flows, and archive parsers.
 */

export const APP_CONFIG = {
  NAME: "Insta Parser",
  DESCRIPTION:
    "View, search, and manage your official Instagram export archive in an authentic Instagram interface.",
  SLOGAN: "Instagram Archive Analytics Platform",
  DEFAULT_SITE_URL: "https://insta-parser-as-developer.vercel.app",
  LOCAL_DEV_URL: "http://192.168.0.57:3000",
};

export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "mc3vzx8x",
  UPLOAD_PRESET:
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "insta_parser_preset",
  FOLDERS: {
    POSTS: "insta_parser/posts",
    STORIES: "insta_parser/stories",
    CHATS: "insta_parser/chats",
    CHAT: "insta_parser/chats",
    AVATAR: "insta_parser/avatar",
  },
};

export const PAGINATION_LIMITS = {
  // Direct Messages Limits
  MESSAGES_DEFAULT: 200,
  MESSAGES_SCROLL_UP: 100,
  MESSAGES_SCROLL_DOWN: 100,
  MESSAGES_SEARCH_WINDOW: 150,
  MESSAGES_MAX: 500,

  // UI Infinite Scroll & Progressive Batch Sizes
  POSTS_BATCH_SIZE: 12,
  STORIES_BATCH_SIZE: 12,
  PREFERENCES_BATCH_SIZE: 20,
  MEDIA_VAULT_BATCH_SIZE: 24,
};

/**
 * Returns the current runtime origin (client-side window.location.origin or production/fallback URL)
 */
export const getAppOrigin = () => {
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.origin
  ) {
    return window.location.origin;
  }
  return APP_CONFIG.DEFAULT_SITE_URL;
};
