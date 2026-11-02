import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: [
    'Profile',
    'Preferences',
    'Connections',
    'ActivityLog',
    'MediaVault',
    'Conversations',
    'Messages',
    'Favorites',
  ],
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => '/profile',
      providesTags: ['Profile'],
    }),
    getPreferences: builder.query({
      query: () => '/preferences',
      providesTags: ['Preferences'],
    }),
    getConnections: builder.query({
      query: (type = 'all') => `/connections?type=${type}`,
      providesTags: ['Connections'],
    }),
    getActivityLog: builder.query({
      query: () => '/activity-log',
      providesTags: ['ActivityLog'],
    }),
    getMediaVault: builder.query({
      query: ({ filter = 'all', limit = 20, offset = 0 } = {}) =>
        `/media?filter=${filter}&type=${filter}&limit=${limit}&offset=${offset}`,
      providesTags: ['MediaVault'],
    }),
    getConversations: builder.query({
      query: () => '/conversations',
      providesTags: ['Conversations'],
    }),
    getMessages: builder.query({
      query: (params) => {
        if (typeof params === 'string') {
          return `/messages?conversationId=${params}`;
        }
        const { conversationId, limit = 200, offset = 0, aroundId, beforeDate, afterDate } = params || {};
        let url = `/messages?conversationId=${conversationId}&limit=${limit}`;
        if (aroundId) {
          url += `&aroundId=${aroundId}`;
        } else if (beforeDate) {
          url += `&beforeDate=${encodeURIComponent(beforeDate)}`;
        } else if (afterDate) {
          url += `&afterDate=${encodeURIComponent(afterDate)}`;
        } else if (offset) {
          url += `&offset=${offset}`;
        }
        return url;
      },
      providesTags: (result, error, params) => {
        const id = typeof params === 'string' ? params : params?.conversationId;
        return [{ type: 'Messages', id }];
      },
    }),
    searchMessages: builder.query({
      query: ({ conversationId, query }) =>
        `/messages/search?conversationId=${conversationId}&query=${encodeURIComponent(query)}`,
    }),
    getMediaMessages: builder.query({
      query: ({ conversationId, limit = 20, offset = 0, type = 'all' }) =>
        `/messages/media?conversationId=${conversationId}&limit=${limit}&offset=${offset}&type=${type}`,
    }),
    getFavorites: builder.query({
      query: (params) => {
        if (!params) return '/favorites';
        const search = new URLSearchParams();
        if (params.conversationId) search.set('conversationId', params.conversationId);
        if (params.tag) search.set('tag', params.tag);
        if (params.query) search.set('query', params.query);
        const qs = search.toString();
        return qs ? `/favorites?${qs}` : '/favorites';
      },
      providesTags: ['Favorites'],
    }),
    addFavorite: builder.mutation({
      query: (body) => ({
        url: '/favorites',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Favorites'],
    }),
    removeFavorite: builder.mutation({
      query: ({ messageId }) => ({
        url: `/favorites?messageId=${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Favorites'],
    }),
    updateFavorite: builder.mutation({
      query: (body) => ({
        url: '/favorites',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Favorites'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useLazyGetPreferencesQuery,
  useLazyGetConnectionsQuery,
  useLazyGetActivityLogQuery,
  useLazyGetMediaVaultQuery,
  useLazyGetConversationsQuery,
  useLazyGetMessagesQuery,
  useLazySearchMessagesQuery,
  useLazyGetMediaMessagesQuery,
  useGetFavoritesQuery,
  useLazyGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useUpdateFavoriteMutation,
} = apiSlice;
