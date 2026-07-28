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
        `/media?filter=${filter}&limit=${limit}&offset=${offset}`,
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
  }),
});

export const {
  useLazyGetProfileQuery,
  useLazyGetPreferencesQuery,
  useLazyGetConnectionsQuery,
  useLazyGetActivityLogQuery,
  useLazyGetMediaVaultQuery,
  useLazyGetConversationsQuery,
  useLazyGetMessagesQuery,
  useLazySearchMessagesQuery,
  useLazyGetMediaMessagesQuery,
} = apiSlice;
