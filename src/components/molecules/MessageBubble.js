import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

export default function MessageBubble({ message, isMe, highlight }) {
  const time = message.sent_at
    ? new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

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
          <mark key={i} className="bg-yellow-400/40 text-white rounded px-0.5">
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

  return (
    <div className={`relative flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-end ml-auto' : 'items-start mr-auto'}`}>
      {/* Sender label for received messages */}
      {!isMe && (
        <span className="text-[10px] text-gray-500 pl-1 mb-0.5">{message.sender_name}</span>
      )}

      {/* ── Shared post / reel card ── */}
      {message.message_type === 'share' && (message.share_url || message.share_text) && (
        <a
          href={message.share_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex flex-col gap-1.5 px-3.5 py-2.5 rounded-[18px] border text-sm transition-colors max-w-[260px] ${
            isMe
              ? 'bg-ig-primary/10 border-ig-primary/30 text-white rounded-br-[6px] hover:bg-ig-primary/20'
              : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-100 rounded-bl-[6px] hover:bg-[#333]'
          }`}
        >
          {message.share_text && (
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{message.share_text}</p>
          )}
          {message.share_url && (
            <div className="flex items-center gap-1 text-[11px] text-ig-primary/80">
              <ExternalLink size={11} />
              <span className="truncate max-w-[200px]">
                {message.share_url.replace(/^https?:\/\//, '').replace(/\?.*/, '')}
              </span>
            </div>
          )}
        </a>
      )}

      {/* ── Media attachment ── */}
      {message.media_url && (
        <div
          className={`overflow-hidden rounded-[18px] ${
            isMe ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'
          }`}
          style={{ maxWidth: '240px' }}
        >
          {isAudio ? (
            <audio
              src={message.media_url}
              controls
              className="w-48 rounded-xl"
            />
          ) : isVideo ? (
            <video
              src={message.media_url}
              controls
              className="rounded-[18px] max-w-full"
              style={{ maxHeight: '300px' }}
            />
          ) : (
            <div className="relative w-48 aspect-[4/5] bg-[#1a1a1a]">
              <Image
                src={message.media_url}
                alt="DM Media Attachment"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Text bubble ── */}
      {message.content && !isPlaceholderAttachmentText && (
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap ${
            isMe
              ? 'bg-ig-primary text-white rounded-[22px] rounded-br-[6px]'
              : 'bg-[#2a2a2a] text-gray-100 rounded-[22px] rounded-bl-[6px]'
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
              className="flex items-center gap-1 bg-[#1e1e1e] border border-[#333] text-white px-2 py-0.5 rounded-full text-xs shadow-md cursor-pointer hover:bg-[#2a2a2a] transition-colors"
            >
              <span>{emoji}</span>
              {info.count > 1 && (
                <span className="text-[10px] text-gray-400 font-semibold">{info.count}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Timestamp ── */}
      <span className={`text-[10px] text-gray-600 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
        {time}
      </span>
    </div>
  );
}
