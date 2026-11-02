'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Star,
  Search,
  X,
  Tag,
  MessageCircle,
  Trash2,
  ExternalLink,
  ArrowRight,
  Edit3,
  Check,
  Loader2,
  Play,
  Volume2,
} from 'lucide-react';
import {
  useGetFavoritesQuery,
  useRemoveFavoriteMutation,
  useUpdateFavoriteMutation,
  useGetProfileQuery,
} from '@/store/api/apiSlice';

function cleanName(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[【】~_.\s]/g, '')
    .trim();
}

function formatMessageDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const dateFormatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeFormatted = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateFormatted}, ${timeFormatted}`;
}

function checkIsUserSender(msgSenderName, participantName, ownerUsername, userProfile) {
  if (!msgSenderName) return false;
  const cleanSender = cleanName(msgSenderName);
  const cleanParticipant = cleanName(participantName);
  const cleanOwner = cleanName(ownerUsername);
  const cleanUser = cleanName(userProfile?.username);
  const cleanFullName = cleanName(userProfile?.full_name);

  // 1. If sender matches the contact / participant name -> it is from the contact
  if (
    cleanParticipant &&
    (cleanSender === cleanParticipant ||
      cleanSender.includes(cleanParticipant) ||
      cleanParticipant.includes(cleanSender))
  ) {
    return false;
  }

  // 2. If sender matches the logged-in user profile or conversation owner
  if (cleanUser && cleanSender === cleanUser) return true;
  if (cleanFullName && cleanSender === cleanFullName) return true;
  if (cleanOwner && cleanSender === cleanOwner) return true;

  // 3. In 1-on-1 chats, if sender is NOT the participant, it must be the user
  return true;
}

function extractReactions(reactions) {
  if (!reactions || !Array.isArray(reactions) || reactions.length === 0) return null;
  return reactions.reduce((acc, r) => {
    const rawEmoji = r.emoji || '❤️';
    const emojiMatch = rawEmoji.match(
      /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u200d\ud800-\udfff]+)/u
    );
    const emoji = emojiMatch ? emojiMatch[0] : rawEmoji.charAt(0);
    if (!acc[emoji]) acc[emoji] = { count: 0, senders: [] };
    acc[emoji].count += 1;
    if (r.sender) acc[emoji].senders.push(r.sender);
    return acc;
  }, {});
}

function cleanShareUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\?.*/, '');
}

function isAttachmentPlaceholder(content) {
  if (!content) return false;
  return /^\s*.*?\bsent an attachment\.\s*$/i.test(content);
}

const PRESET_TAGS = ['All', 'General', 'Memories', 'Important', 'Quotes', 'Links'];

export default function SavedMessagesSection() {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvId, setSelectedConvId] = useState('all');

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagDraft, setTagDraft] = useState('');

  // Inline loading states
  const [removingId, setRemovingId] = useState(null);
  const [savingTagId, setSavingTagId] = useState(null);
  const [savingTagChoice, setSavingTagChoice] = useState(null);
  const [savingNoteId, setSavingNoteId] = useState(null);

  const { data: profileData } = useGetProfileQuery();
  const userProfile = profileData?.profile;

  const { data, isLoading } = useGetFavoritesQuery();
  const [removeFavorite] = useRemoveFavoriteMutation();
  const [updateFavorite] = useUpdateFavoriteMutation();

  const favorites = data?.favorites || [];

  // Extract unique conversation participants for filter dropdown
  const conversationsList = useMemo(() => {
    const map = new Map();
    favorites.forEach((fav) => {
      if (fav.conversation_id && fav.conversation?.participant_name) {
        map.set(fav.conversation_id, fav.conversation.participant_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [favorites]);

  // Combine preset tags with user tags from API and loaded favorites
  const allTags = useMemo(() => {
    const set = new Set(PRESET_TAGS);
    (data?.tags || []).forEach((t) => {
      if (t && t.trim()) set.add(t.trim());
    });
    favorites.forEach((fav) => {
      if (fav.tag && fav.tag.trim()) set.add(fav.tag.trim());
    });
    return Array.from(set);
  }, [data?.tags, favorites]);

  // Available tags to choose from when assigning (excludes 'All')
  const availableTags = useMemo(() => {
    return allTags.filter((t) => t !== 'All');
  }, [allTags]);

  // Filter favorites
  const filteredFavorites = useMemo(() => {
    return favorites.filter((fav) => {
      // Filter by tag
      if (selectedTag !== 'All' && fav.tag !== selectedTag) return false;

      // Filter by conversation
      if (selectedConvId !== 'all' && fav.conversation_id !== selectedConvId) return false;

      // Filter by query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const contentMatch = fav.message?.content?.toLowerCase().includes(q);
      const senderMatch = fav.message?.sender_name?.toLowerCase().includes(q);
      const participantMatch = fav.conversation?.participant_name?.toLowerCase().includes(q);
      const noteMatch = fav.note?.toLowerCase().includes(q);
      const tagMatch = fav.tag?.toLowerCase().includes(q);
      return contentMatch || senderMatch || participantMatch || noteMatch || tagMatch;
    });
  }, [favorites, selectedTag, selectedConvId, searchQuery]);

  const handleRemove = async (messageId) => {
    setRemovingId(messageId);
    try {
      await removeFavorite({ messageId }).unwrap();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleSaveNote = async (messageId) => {
    setSavingNoteId(messageId);
    try {
      await updateFavorite({ messageId, note: noteDraft.trim() || null }).unwrap();
      setEditingNoteId(null);
      setNoteDraft('');
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleSaveTag = async (messageId) => {
    if (!tagDraft.trim()) return;
    setSavingTagId(messageId);
    setSavingTagChoice('custom');
    try {
      await updateFavorite({ messageId, tag: tagDraft.trim() }).unwrap();
      setEditingTagId(null);
      setTagDraft('');
    } catch (err) {
      console.error('Failed to update tag:', err);
    } finally {
      setSavingTagId(null);
      setSavingTagChoice(null);
    }
  };

  const handleSaveDirectTag = async (messageId, tagChoice) => {
    setSavingTagId(messageId);
    setSavingTagChoice(tagChoice);
    try {
      await updateFavorite({ messageId, tag: tagChoice || 'General' }).unwrap();
      setEditingTagId(null);
      setTagDraft('');
    } catch (err) {
      console.error('Failed to update tag directly:', err);
    } finally {
      setSavingTagId(null);
      setSavingTagChoice(null);
    }
  };

  const handleJumpToChat = (fav) => {
    if (!fav.conversation_id || !fav.message_id) return;
    router.push(`/direct?conversationId=${fav.conversation_id}&messageId=${fav.message_id}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3.5 sm:px-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Star size={20} className="fill-amber-400" />
            </div>
            <span>Saved Messages & Memories</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Your personal collection of memorable messages, important details, and quotes saved across all chats.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-600 dark:text-amber-400 self-start sm:self-auto shadow-sm">
          <Star size={12} className="fill-amber-400" />
          <span>{favorites.length} Starred</span>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#222222] rounded-2xl p-3.5 sm:p-4 mb-5 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search box */}
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-[#282828] focus-within:border-ig-primary transition-colors">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, person, or notes..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-0.5"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Conversation filter dropdown */}
          {conversationsList.length > 0 && (
            <div className="sm:w-56 flex-shrink-0">
              <select
                value={selectedConvId}
                onChange={(e) => setSelectedConvId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#181818] border border-gray-200 dark:border-[#282828] rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:border-ig-primary transition-colors cursor-pointer"
              >
                <option value="all">All Conversations</option>
                {conversationsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tag filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {allTags.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-[#181818] text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-[#282828] hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                }`}
              >
                {tag !== 'All' && <Tag size={10} />}
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Saved Messages Rows List ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
          <Loader2 size={26} className="animate-spin text-amber-500" />
          <span className="text-xs font-medium">Loading saved messages...</span>
        </div>
      ) : filteredFavorites.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {filteredFavorites.map((fav) => {
            const msg = fav.message;
            if (!msg) return null;

            const isEditingThisNote = editingNoteId === fav.id;
            const isEditingThisTag = editingTagId === fav.id;

            const participantName = fav.conversation?.participant_name || 'Instagram User';
            const ownerUsername = fav.conversation?.owner_username;
            const isMe = checkIsUserSender(msg.sender_name, participantName, ownerUsername, userProfile);
            const isParticipantSender = cleanName(msg.sender_name) === cleanName(participantName);

            const isShare = Boolean(msg.share_url || msg.message_type === 'share');
            const isPlaceholder = isAttachmentPlaceholder(msg.content);
            const hasRealText = Boolean(msg.content && msg.content.trim() && !isPlaceholder);

            const isAudio = msg.media_url?.match(/\.(m4a|mp3|ogg|wav)/i) || msg.media_type === 'audio';
            const isVideo = msg.media_url?.match(/\.(mp4|mov|webm)/i) || msg.media_type === 'video';
            const isReel = msg.share_url?.includes('/reel/') || msg.share_url?.includes('/reels/');

            const groupedReactions = extractReactions(msg.reactions);
            const formattedDate = formatMessageDate(msg.sent_at);

            return (
              <div
                key={fav.id}
                className="bg-white dark:bg-[#101010] hover:bg-gray-50/70 dark:hover:bg-[#151515] border border-gray-200/80 dark:border-[#202020] hover:border-gray-300 dark:hover:border-[#303030] rounded-2xl p-3.5 sm:p-4 transition-all duration-150 flex flex-col gap-3 group relative shadow-none hover:shadow-sm"
              >
                {/* ── Top Header Line: Avatar + Info + Actions ── */}
                <div className="flex items-start justify-between gap-2.5">
                  {/* Left: Avatar + Contact details + Tags */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Contact Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-0.5 flex-shrink-0 shadow-sm mt-0.5">
                      <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center font-bold text-gray-900 dark:text-white text-xs uppercase">
                        {participantName.charAt(0)}
                      </div>
                    </div>

                    {/* Contact Name & Metadata Column */}
                    <div className="min-w-0 flex-1">
                      {/* Name Line */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white truncate leading-tight">
                          {participantName}
                        </span>
                      </div>

                      {/* Sub-meta: Direction & Timestamp */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                        {isMe && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md font-semibold text-[10px] bg-ig-primary/10 text-ig-primary dark:text-ig-primary border border-ig-primary/20 flex-shrink-0">
                            Sent by you
                          </span>
                        )}

                        {!isMe && !isParticipantSender && (
                          <span className="truncate max-w-[140px]">
                            via <strong className="text-gray-700 dark:text-gray-300">{msg.sender_name}</strong>
                          </span>
                        )}

                        {(isMe || (!isMe && !isParticipantSender)) && <span>•</span>}
                        <span className="whitespace-nowrap">{formattedDate}</span>
                      </div>

                      {/* Tag pill & Note badge row */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {/* Tag Pill Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (savingTagId === msg.id) return;
                            setEditingNoteId(null);
                            setEditingTagId(editingTagId === fav.id ? null : fav.id);
                            setTagDraft(fav.tag || 'General');
                          }}
                          disabled={savingTagId === msg.id}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-sm flex-shrink-0 ${
                            savingTagId === msg.id
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-wait'
                              : isEditingThisTag
                              ? 'bg-amber-500 text-white ring-2 ring-amber-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                          title={savingTagId === msg.id ? 'Updating tag...' : 'Click to edit or switch tag'}
                        >
                          {savingTagId === msg.id ? (
                            <Loader2 size={11} className="animate-spin text-amber-500" />
                          ) : (
                            <Tag size={11} className={isEditingThisTag ? 'fill-current' : ''} />
                          )}
                          <span>{savingTagId === msg.id ? 'Updating...' : (fav.tag || 'General')}</span>
                          {savingTagId !== msg.id && <Edit3 size={10} className="opacity-70 ml-0.5" />}
                        </button>

                        {/* Note badge / Add note action */}
                        {savingNoteId === msg.id ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                            <Loader2 size={11} className="animate-spin text-amber-500" />
                            <span>Saving note...</span>
                          </div>
                        ) : !isEditingThisNote && (
                          fav.note ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTagId(null);
                                setEditingNoteId(fav.id);
                                setNoteDraft(fav.note);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1 max-w-[200px] sm:max-w-xs hover:bg-amber-500/20 active:scale-95 transition-all shadow-sm flex-shrink-0"
                              title="Click to edit note"
                            >
                              <span>📝</span>
                              <span className="truncate italic font-medium">{fav.note}</span>
                              <Edit3 size={10} className="opacity-70 ml-0.5 flex-shrink-0" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTagId(null);
                                setEditingNoteId(fav.id);
                                setNoteDraft('');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 py-0.5 px-1.5 font-medium transition-colors"
                            >
                              <Edit3 size={11} />
                              <span>+ Add note</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Jump & Trash */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleJumpToChat(fav)}
                      className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-ig-primary hover:bg-ig-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
                      title="Open in conversation"
                    >
                      <span>Jump</span>
                      <ArrowRight size={12} />
                    </button>

                    <button
                      onClick={() => handleRemove(msg.id)}
                      disabled={removingId === msg.id}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Remove from saved"
                      aria-label="Remove from saved"
                    >
                      {removingId === msg.id ? (
                        <Loader2 size={15} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Mobile-Friendly Tag Selector Panel ── */}
                {isEditingThisTag && (
                  <div
                    className="p-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-[#282828] rounded-2xl flex flex-col gap-2.5 shadow-inner"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Tag size={13} className="text-amber-500" />
                        <span>Select Tag (Custom & Presets)</span>
                      </span>
                      <button
                        onClick={() => setEditingTagId(null)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#252525] transition-colors"
                        title="Close tag editor"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* All Available Tags (Presets + Custom Tags) */}
                    <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-0.5">
                      {availableTags.map((tagOption) => {
                        const isCurrent = (fav.tag || 'General') === tagOption;
                        const isThisTagLoading = savingTagId === msg.id && savingTagChoice === tagOption;
                        return (
                          <button
                            key={tagOption}
                            onClick={() => handleSaveDirectTag(msg.id, tagOption)}
                            disabled={savingTagId === msg.id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
                              isThisTagLoading
                                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30 cursor-wait'
                                : isCurrent
                                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                                : 'bg-white dark:bg-[#202020] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282828] border border-gray-200 dark:border-[#333]'
                            } ${savingTagId === msg.id && !isThisTagLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {isThisTagLoading ? (
                              <Loader2 size={11} className="animate-spin text-white" />
                            ) : (
                              <Tag size={10} className={isCurrent ? 'fill-current' : 'text-gray-400'} />
                            )}
                            <span>{tagOption}</span>
                            {isCurrent && !isThisTagLoading && <Check size={11} className="ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Create New Custom Tag Input */}
                    <div className="pt-2 border-t border-gray-200/80 dark:border-[#262626] flex items-center gap-2">
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          placeholder="Type a new custom tag..."
                          disabled={savingTagId === msg.id}
                          className="w-full h-9 bg-white dark:bg-[#202020] border border-gray-300 dark:border-[#383838] rounded-xl px-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTag(msg.id);
                            if (e.key === 'Escape') setEditingTagId(null);
                          }}
                          autoFocus
                        />
                        {tagDraft && !savingTagId && (
                          <button
                            onClick={() => setTagDraft('')}
                            className="absolute right-2 text-gray-400 hover:text-gray-600 p-1"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleSaveTag(msg.id)}
                        disabled={!tagDraft.trim() || savingTagId === msg.id}
                        className="h-9 px-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 flex-shrink-0"
                      >
                        {savingTagId === msg.id && savingTagChoice === 'custom' ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <Check size={13} />
                            <span>Apply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Mobile-Friendly Note Editor Card ── */}
                {isEditingThisNote && (
                  <div
                    className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col gap-2.5 shadow-inner"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Personal Memory Note</span>
                      </span>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        disabled={savingNoteId === msg.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                        title="Cancel"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Why did you save this message? Add context or a reminder..."
                      disabled={savingNoteId === msg.id}
                      className="w-full bg-white dark:bg-[#181818] border border-gray-300 dark:border-[#383838] rounded-xl p-2.5 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-amber-500 resize-none transition-colors disabled:opacity-50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveNote(msg.id);
                        }
                      }}
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        disabled={savingNoteId === msg.id}
                        className="px-3 h-8 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveNote(msg.id)}
                        disabled={savingNoteId === msg.id}
                        className="px-4 h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        {savingNoteId === msg.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={13} />
                            <span>Save Note</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Message Content (Directly displayed text, media preview, or link) ── */}
                <div
                  onClick={() => handleJumpToChat(fav)}
                  className="cursor-pointer group/content pt-0.5"
                  title="Click to jump to this message in chat"
                >
                  {/* Text Message */}
                  {hasRealText && !isShare && (
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words font-normal group-hover/content:text-gray-950 dark:group-hover/content:text-white transition-colors">
                      {msg.content}
                    </p>
                  )}

                  {/* Shared Reel / Post Link */}
                  {isShare && (
                    <div className="flex flex-col gap-1.5">
                      {hasRealText && (
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words font-normal">
                          {msg.content}
                        </p>
                      )}
                      <a
                        href={msg.share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline max-w-fit transition-colors"
                      >
                        <Play size={12} className="fill-current flex-shrink-0" />
                        <span>{isReel ? 'Instagram Reel' : 'Instagram Post'}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal truncate max-w-[200px] sm:max-w-xs">
                          • {cleanShareUrl(msg.share_url)}
                        </span>
                        <ExternalLink size={11} className="flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Media Preview (Photo / Video / Audio) */}
                  {msg.media_url && (
                    <div className="mt-1">
                      {isAudio ? (
                        <div className="p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center gap-2 max-w-xs">
                          <Volume2 size={15} className="text-ig-primary flex-shrink-0" />
                          <audio
                            src={msg.media_url}
                            controls
                            className="w-full h-7"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : isVideo ? (
                        <video
                          src={msg.media_url}
                          controls
                          className="rounded-xl max-h-48 max-w-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="relative rounded-xl overflow-hidden max-w-xs max-h-48 border border-gray-200 dark:border-[#282828] bg-gray-100 dark:bg-[#181818] shadow-sm">
                          <img
                            src={msg.media_url}
                            alt="Saved Media"
                            className="rounded-xl max-h-48 w-auto object-cover hover:opacity-95 transition-opacity"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reaction Emojis */}
                  {groupedReactions && Object.keys(groupedReactions).length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {Object.entries(groupedReactions).map(([emoji, info]) => (
                        <span
                          key={emoji}
                          title={info.senders.length > 0 ? `Reacted by ${info.senders.join(', ')}` : 'Reaction'}
                          className="inline-flex items-center gap-1 bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#303030] px-2 py-0.5 rounded-full text-[11px] text-gray-800 dark:text-gray-200"
                        >
                          <span>{emoji}</span>
                          {info.count > 1 && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                              {info.count}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-[#101010] border border-gray-200 dark:border-[#202020] rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 shadow-sm">
            <Star size={30} className="fill-amber-400/20" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {searchQuery || selectedTag !== 'All' || selectedConvId !== 'all'
              ? 'No saved messages match your filter'
              : 'No saved messages yet'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm leading-relaxed">
            {searchQuery || selectedTag !== 'All' || selectedConvId !== 'all'
              ? 'Try adjusting your search keywords, tag filter, or conversation selection.'
              : 'Whenever you find a message, voice note, or memory in any chat that you want to revisit, click the star icon beside it to save it here.'}
          </p>

          <Link
            href="/direct"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-ig-primary hover:bg-ig-primary-hover text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
          >
            <MessageCircle size={15} />
            <span>Go to Messages</span>
          </Link>
        </div>
      )}
    </div>
  );
}
