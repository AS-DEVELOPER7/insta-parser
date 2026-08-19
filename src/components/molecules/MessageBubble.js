import Image from 'next/image';
import { ExternalLink, Play, Maximize2 } from 'lucide-react';

function formatMessageDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const dateFormatted = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timeFormatted = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateFormatted}, ${timeFormatted}`;
}

export default function MessageBubble({ message, isMe, highlight, onMediaClick }) {
  const time = formatMessageDateTime(message.sent_at);

  const isVideo = message.media_url?.match(/\.(mp4|mov|webm)/i) || message.media_type === 'video';
  const isAudio = message.media_url?.match(/\.(m4a|mp3|ogg|wav)/i) || message.media_type === 'audio';

  /* Highlight matched text safely escaping special regex characters */
  const renderText = (text) => {
    if (!highlight || !text) return text;
    try {
      const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
      return parts.map((p, i) =>
        p.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 text-gray-900 font-bold rounded px-0.5">
            {p}
          </mark>
        ) : (
          p
        )
      );
    } catch (e) {
      return text;
    }
  };

  /* Process reactions into unique emoji counts with hover tooltips (strictly emoji only, no names inside pill) */
  const groupedReactions = message.reactions?.reduce((acc, r) => {
    const rawEmoji = r.emoji || '❤️';
    // Extract strictly the emoji character, stripping any trailing name artifacts
    const emojiMatch = rawEmoji.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u200d\ud800-\udfff]+)/u);
    const emoji = emojiMatch ? emojiMatch[0] : rawEmoji.charAt(0);

    if (!acc[emoji]) acc[emoji] = { count: 0, senders: [] };
    acc[emoji].count += 1;
    if (r.sender) {
      const label = r.time ? `${r.sender} (${r.time})` : r.sender;
      acc[emoji].senders.push(label);
    }
    return acc;
  }, {});

  const isPlaceholderAttachmentText =
    message.content &&
    /^\s*.*?\bsent an attachment\.\s*$/i.test(message.content) &&
    !message.media_url &&
    !message.share_url;

  const handleMediaClick = () => {
    if (onMediaClick && message.media_url) {
      onMediaClick({
        url: message.media_url,
        isVid: isVideo,
        isAudio,
        sender: message.sender_name,
      });
    }
  };

  return (
    <div className={`relative flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-end ml-auto' : 'items-start mr-auto'}`}>
      {/* Sender label for received messages */}
      {!isMe && (
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 pl-1 mb-0.5">{message.sender_name}</span>
      )}

      {/* ── Shared post / reel card ── */}
      {message.message_type === 'share' && (message.share_url || message.share_text) && (
        <a
          href={message.share_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex flex-col gap-1.5 px-3.5 py-2.5 rounded-[18px] border text-sm transition-colors max-w-[260px] ${
            isMe
              ? 'bg-ig-primary text-white border-ig-primary/40 rounded-br-[6px] shadow-sm hover:bg-ig-primary-hover'
              : 'bg-gray-100 dark:bg-[#2a2a2a] border-gray-200 dark:border-[#3a3a3a] text-gray-900 dark:text-gray-100 rounded-bl-[6px] hover:bg-gray-200 dark:hover:bg-[#333]'
          }`}
        >
          {message.share_text && (
            <p className={`text-xs leading-relaxed line-clamp-3 ${isMe ? 'text-white/95 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
              {message.share_text}
            </p>
          )}
          {message.share_url && (
            <div className={`flex items-center gap-1 text-[11px] ${isMe ? 'text-white underline font-semibold' : 'text-ig-primary'}`}>
              <ExternalLink size={11} />
              <span className="truncate max-w-[200px]">
                {message.share_url.replace(/^https?:\/\//, '').replace(/\?.*/, '')}
              </span>
            </div>
          )}
        </a>
      )}

      {/* ── Media attachment (Clickable to open directly in Lightbox) ── */}
      {message.media_url && (
        <div
          onClick={handleMediaClick}
          className={`overflow-hidden rounded-[18px] cursor-pointer group relative transition-all hover:ring-2 hover:ring-ig-primary/60 shadow-sm ${
            isMe ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'
          }`}
          style={{ maxWidth: '240px' }}
          title="Click to view media in full screen"
        >
          {isAudio ? (
            <audio
              src={message.media_url}
              controls
              className="w-48 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : isVideo ? (
            <div className="relative group/vid">
              <video
                src={message.media_url}
                className="rounded-[18px] max-w-full group-hover/vid:opacity-95 transition-opacity"
                style={{ maxHeight: '300px' }}
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/vid:bg-black/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                  <Play size={18} className="fill-current ml-0.5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-48 aspect-[4/5] bg-gray-100 dark:bg-[#1a1a1a] overflow-hidden">
              <Image
                src={message.media_url}
                alt="DM Media Attachment"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Text bubble ── */}
      {message.content && !isPlaceholderAttachmentText && (
        <div
          className={`px-4 py-2.5 text-sm font-medium leading-relaxed break-words whitespace-pre-wrap ${
            isMe
              ? 'bg-ig-primary text-white rounded-[22px] rounded-br-[6px] shadow-sm'
              : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 border border-gray-200/80 dark:border-transparent rounded-[22px] rounded-bl-[6px]'
          }`}
          style={{ maxWidth: '260px' }}
        >
          {renderText(message.content)}
        </div>
      )}

      {/* ── Instagram-Style Reaction Badges (Strictly Emoji Only) ── */}
      {groupedReactions && Object.keys(groupedReactions).length > 0 && (
        <div
          className={`flex items-center gap-1 -mt-2 z-10 ${
            isMe ? 'mr-3 justify-end' : 'ml-3 justify-start'
          }`}
        >
          {Object.entries(groupedReactions).map(([emoji, info]) => (
            <div
              key={emoji}
              title={
                info.senders.length > 0
                  ? `Reacted by ${info.senders.join(', ')}`
                  : 'Reaction'
              }
              className="flex items-center gap-1 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white px-2 py-0.5 rounded-full text-xs shadow-md cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <span>{emoji}</span>
              {info.count > 1 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">{info.count}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Timestamp ── */}
      <span className={`text-[10px] text-gray-500 dark:text-gray-400 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
        {time}
      </span>
    </div>
  );
}
