import { decodeIgText } from './jsonDecoder';
import { findMediaInZip } from './zipResolver';

/**
 * Instagram HTML export message structure (per message block):
 *
 *  <div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder">
 *    <h2 class="...._a6-h _a6-i">SENDER_NAME</h2>
 *    <div class="...._a6-p">
 *      <div>                         ← wrapper
 *        <div></div>                 ← [0] empty
 *        <div>MESSAGE TEXT</div>     ← [1] actual content
 *        <div></div>                 ← [2] empty
 *        <div>                       ← [3] share/attachment details (optional)
 *          <div>
 *            <div>SHARE_CAPTION</div>
 *            <div>SHARE_ACCOUNT</div>
 *            <div><a href="...">URL</a></div>
 *          </div>
 *        </div>
 *        <div>                       ← [4] reactions (optional)
 *          <ul class="_a6-q">
 *            <li><span>❤SENDER<span> (timestamp)</span></span></li>
 *          </ul>
 *        </div>
 *      </div>
 *    </div>
 *    <div class="..._a6-o">TIMESTAMP</div>
 *  </div>
 *
 * Instagram JSON export message object (key fields):
 *  {
 *    sender_name: "...",
 *    timestamp_ms: 1234567890000,
 *    content: "Hello",                // text content
 *    photos: [{ uri: "...jpg" }],
 *    videos: [{ uri: "...mp4" }],
 *    audio_files: [{ uri: "...m4a" }],
 *    share: { link: "https://...", share_text: "caption" },   // shared reel/post
 *    reactions: [{ reaction: "❤", actor: "username" }],
 *    is_unsent: true | false
 */

/** System messages to skip (pure reactions/likes without content) */
const SYSTEM_CONTENT_PATTERNS = [
  /liked a message/i,
  /liked a photo/i,
  /liked a video/i,
  /reacted.*to/i,
  /reacted/i,
];

function isSystemContent(text) {
  if (!text) return false;
  const clean = text.trim().toLowerCase();
  if (clean.includes('reacted') && (clean.includes('to') || clean.includes('message'))) return true;
  if (clean.includes('liked a message') || clean.includes('liked a photo') || clean.includes('liked a video')) return true;
  return SYSTEM_CONTENT_PATTERNS.some((p) => p.test(clean));
}

export async function parseMessages(zipContext, onProgress, options = {}) {
  const { maxThreads = null, selectedThreadIds = null } = options;
  const selectedSet = Array.isArray(selectedThreadIds) ? new Set(selectedThreadIds) : null;
  const { zip, format, messageFiles, mediaFiles } = zipContext;
  const conversationsMap = new Map();

  for (let i = 0; i < messageFiles.length; i++) {
    const filePath = messageFiles[i];
    const fileEntry = zip.files[filePath];
    if (!fileEntry) continue;

    const parts = filePath.split('/');
    const threadFolderId =
      parts.length >= 2 ? parts[parts.length - 2] : 'general_thread';

    // If specific threads were selected, skip unselected ones
    if (selectedSet && !selectedSet.has(threadFolderId)) {
      continue;
    }

    // If maxThreads limit is set and this is a new thread, skip if we already reached limit
    if (maxThreads && maxThreads > 0 && !conversationsMap.has(threadFolderId) && conversationsMap.size >= maxThreads) {
      continue;
    }

    const fileContent = await fileEntry.async('string');

    if (!conversationsMap.has(threadFolderId)) {
      conversationsMap.set(threadFolderId, {
        threadFolderId,
        participantName: threadFolderId.split('_')[0] || threadFolderId,
        ownerUsername: null,   // will be filled from JSON title / HTML header
        isGroup: false,
        messages: [],
        seenKeys: new Set(),
      });
    }

    const conv = conversationsMap.get(threadFolderId);

    const isJsonFile = filePath.toLowerCase().endsWith('.json');

    // ── JSON FORMAT ──────────────────────────────────────────────────────────
    if (isJsonFile) {
      try {
        const jsonData = JSON.parse(fileContent);

        // Conversation title = the other person's display name
        if (jsonData.title) {
          conv.participantName = decodeIgText(jsonData.title);
        }

        // Participants: the owner is the one NOT matching the title
        if (jsonData.participants && Array.isArray(jsonData.participants)) {
          if (jsonData.participants.length > 2) conv.isGroup = true;

          // Owner = participant whose name is NOT the decoded title
          const titleDecoded = conv.participantName.toLowerCase();
          const owner = jsonData.participants.find(
            (p) => decodeIgText(p.name || '').toLowerCase() !== titleDecoded
          );
          if (owner) conv.ownerUsername = decodeIgText(owner.name);
        }

        const rawMsgs = jsonData.messages || (Array.isArray(jsonData) ? jsonData : []);

        for (const msg of rawMsgs) {
          if (!msg || typeof msg !== 'object') continue;
          if (msg.is_unsent) continue;

          const senderName = decodeIgText(msg.sender_name || 'Unknown');
          const rawContent = msg.content ? decodeIgText(msg.content) : '';

          // Skip system messages
          if (rawContent && isSystemContent(rawContent)) continue;

          const sentAtNum = msg.timestamp_ms || (msg.timestamp ? msg.timestamp * 1000 : null);
          const sentAt = sentAtNum
            ? new Date(sentAtNum).toISOString()
            : new Date().toISOString();

          // ── Reactions ──
          const reactions = [];
          if (Array.isArray(msg.reactions)) {
            for (const r of msg.reactions) {
              reactions.push({
                emoji: decodeIgText(r.reaction || ''),
                sender: decodeIgText(r.actor || r.sender || ''),
              });
            }
          }

          // ── Media (photos / videos / audio) ──
          let mediaUri = null;
          let mediaType = null;

          if (msg.photos?.length > 0) {
            mediaUri = msg.photos[0].uri;
            mediaType = 'image';
          } else if (msg.videos?.length > 0) {
            mediaUri = msg.videos[0].uri;
            mediaType = 'video';
          } else if (msg.audio_files?.length > 0) {
            mediaUri = msg.audio_files[0].uri;
            mediaType = 'audio';
          } else if (msg.media) {
            mediaUri =
              typeof msg.media === 'string'
                ? msg.media
                : msg.media.uri || (Array.isArray(msg.media) && msg.media[0]?.uri);
            if (mediaUri) mediaType = mediaUri.match(/\.(mp4|mov|webm)/i) ? 'video' : 'image';
          }

          let mediaZipEntry = null;
          if (mediaUri) {
            mediaZipEntry = findMediaInZip(mediaUri, mediaFiles, zip, threadFolderId);
          }

          // ── Shared post / reel ──
          let shareUrl = null;
          let shareText = null;
          if (msg.share) {
            shareUrl = msg.share.link || null;
            shareText = msg.share.share_text ? decodeIgText(msg.share.share_text) : null;
          }

          // ── Message type ──
          let messageType = 'text';
          if (mediaUri) messageType = 'media';
          else if (shareUrl) messageType = 'share';
          else if (!rawContent) continue; // skip empty

          const content = rawContent || null;

          const timeMs = new Date(sentAt).getTime();
          const secondKey = Math.floor(timeMs / 1000);
          const cleanText = (content || '').trim().toLowerCase();
          const msgKey = `${senderName}_${secondKey}_${cleanText}_${mediaUri || shareUrl || ''}`;

          if (conv.seenKeys.has(msgKey)) continue;
          conv.seenKeys.add(msgKey);

          conv.messages.push({
            senderName,
            content,
            sentAt,
            mediaUri,
            mediaZipEntry,
            mediaType,
            messageType,
            reactions,
            shareUrl,
            shareText,
          });
        }
      } catch (e) {
        console.error('Failed to parse JSON message thread:', filePath, e);
      }

    // ── HTML FORMAT ──────────────────────────────────────────────────────────
    } else {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(fileContent, 'text/html');

        const pageTitle = doc.querySelector('title')?.textContent?.trim();
        if (pageTitle) conv.participantName = pageTitle;

        // Message blocks finder compatible with ALL Instagram HTML export schemas (2018-2026)
        let blocks = Array.from(doc.querySelectorAll('div._a6-g, div.pam, div.uiBoxWhite'));
        if (blocks.length === 0) {
          const headers = Array.from(doc.querySelectorAll('h2, ._a6-h, ._2pim'));
          blocks = headers.map((h) => h.closest('div.pam, div') || h.parentElement).filter(Boolean);
        }

        // Reverse to process oldest to newest
        const msgBlocks = blocks.reverse();

        // Used timestamps map per file to assign unique milliseconds for messages in the same minute
        const usedTimestampsMap = new Map();

        msgBlocks.forEach((block) => {
          // Sender (h2, ._a6-h, ._2pim)
          const senderEl = block.querySelector('h2._a6-h, h2, ._2pim');
          if (!senderEl) return;
          const senderName = senderEl.textContent.trim();
          if (!senderName || senderName === 'Instagram') return;

          // Timestamp (div._a6-o, div._3-94, div.timestamp)
          const timeEl = block.querySelector('div._a6-o, div._3-94, div.timestamp, .timestamp');
          const timeStr = timeEl ? timeEl.textContent.trim() : '';
          const baseSentAt = parseHtmlTime(timeStr);

          // Guarantee unique timestamp per sender/message to prevent Supabase ON CONFLICT overwrites
          let sentAtMs = new Date(baseSentAt).getTime();
          if (isNaN(sentAtMs)) sentAtMs = Date.now();
          while (usedTimestampsMap.has(`${senderName}_${sentAtMs}`)) {
            sentAtMs += 10;
          }
          usedTimestampsMap.set(`${senderName}_${sentAtMs}`, true);
          const sentAt = new Date(sentAtMs).toISOString();

          // Content area (div._a6-p, div._3-95)
          let contentArea = block.querySelector('div._a6-p, div._3-95');
          if (!contentArea || contentArea === senderEl) contentArea = block;
          let content = null;
          let shareUrl = null;
          let shareText = null;
          const reactions = [];

          if (contentArea) {
            // Reactions from ul._a6-q with timestamp
            const reactionsUl = contentArea.querySelector('ul._a6-q');
            if (reactionsUl) {
              reactionsUl.querySelectorAll('li').forEach((li) => {
                const text = li.textContent.trim();
                // Extract strictly the emoji character using unicode regex
                const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u200d\ud800-\udfff]+)/u;
                const match = text.match(emojiRegex);
                const emoji = match ? match[0] : text.charAt(0);
                let sender = text.substring(emoji.length).trim();
                let time = '';

                const timeMatch = sender.match(/^(.*?)\s*\((.*?)\)$/);
                if (timeMatch) {
                  sender = timeMatch[1].trim();
                  time = timeMatch[2].trim();
                }

                reactions.push({
                  emoji,
                  sender,
                  time,
                });
              });
            }

            // External links (instagram reel/story/post share or external URL)
            const linkEl = contentArea.querySelector('a[href]');
            if (linkEl) {
              const href = linkEl.getAttribute('href');
              if (href && !href.startsWith('javascript:')) {
                shareUrl = href;
              }
            }

            // Clone contentArea to inspect text without reactions element
            const areaClone = contentArea.cloneNode(true);
            const ulInClone = areaClone.querySelector('ul._a6-q');
            if (ulInClone) ulInClone.remove();

            // Remove link text if present so text content remains clean
            const aInClone = areaClone.querySelector('a');
            if (aInClone) aInClone.remove();

            let fullText = areaClone.textContent.trim();

            // Clean out "You sent an attachment." / "Dr. sent an attachment." phrase
            fullText = fullText
              .replace(/^.*?\bsent an attachment\.\s*/gi, '')
              .replace(/^You sent an attachment\.\s*/gi, '')
              .replace(/^sent an attachment\.\s*/gi, '')
              .trim();

            if (fullText && isSystemContent(fullText)) {
              fullText = null;
            }

            if (fullText) {
              content = fullText;
            }
          }

          // Media attachments
          let mediaUri = null;
          let mediaType = null;
          let mediaZipEntry = null;

          const imgEl = block.querySelector('img[src]');
          const vidEl = block.querySelector('video[src]');
          const audEl = block.querySelector('audio[src]');

          if (vidEl) {
            mediaUri = vidEl.getAttribute('src');
            mediaType = 'video';
          } else if (imgEl && !imgEl.getAttribute('src')?.includes('Instagram-Logo')) {
            mediaUri = imgEl.getAttribute('src');
            mediaType = 'image';
          } else if (audEl) {
            mediaUri = audEl.getAttribute('src');
            mediaType = 'audio';
          }

          if (mediaUri && !mediaUri.startsWith('data:')) {
            mediaZipEntry = findMediaInZip(mediaUri, mediaFiles, zip, threadFolderId);
          }

          let messageType = 'text';
          if (mediaUri) messageType = 'media';
          else if (shareUrl || shareText) messageType = 'share';

          // If block has no text/media/share content, attach reactions to previous message if available
          if (!content && !mediaUri && !shareUrl && !shareText) {
            if (reactions.length > 0 && conv.messages.length > 0) {
              const lastMsg = conv.messages[conv.messages.length - 1];
              lastMsg.reactions = [...(lastMsg.reactions || []), ...reactions];
            }
            return;
          }

          const timeMs = new Date(sentAt).getTime();
          const secondKey = Math.floor(timeMs / 1000);
          const cleanText = (content || '').trim().toLowerCase();
          const msgKey = `${senderName}_${secondKey}_${cleanText}_${mediaUri || shareUrl || ''}`;

          if (conv.seenKeys.has(msgKey)) return;
          conv.seenKeys.add(msgKey);

          conv.messages.push({
            senderName,
            content,
            sentAt,
            mediaUri,
            mediaZipEntry,
            mediaType,
            messageType,
            reactions,
            shareUrl,
            shareText,
          });
        });
      } catch (e) {
        console.error('Failed to parse HTML message thread:', filePath, e);
      }
    }

    if (onProgress) {
      onProgress({
        phase: 'messages',
        current: i + 1,
        total: messageFiles.length,
        threadsParsed: conversationsMap.size,
      });
    }
  }

  console.log('Total parsed chat threads:', conversationsMap.size);

  // Sort messages in each thread chronologically by sentAt (oldest to newest)
  const allThreads = Array.from(conversationsMap.values());
  for (const conv of allThreads) {
    conv.messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  return allThreads;
}

function parseHtmlTime(str) {
  if (!str) return new Date().toISOString();
  // Clean non-breaking spaces, HTML entities & extra whitespace
  const cleanStr = str
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    // Attempt standard JS Date parse
    let d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d.toISOString();

    // Fix extra commas e.g. "Apr 11, 2025, 11:20 am" -> "Apr 11, 2025 11:20 am"
    const fixedComma = cleanStr.replace(/(\d{4}),\s*/, '$1 ');
    d = new Date(fixedComma);
    if (!isNaN(d.getTime())) return d.toISOString();

    // Parse "MMM DD, YYYY HH:MM am/pm" manually
    const dateMatch = cleanStr.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (dateMatch) {
      const [, monthStr, day, year, hours, minutes, ampm] = dateMatch;
      let h = parseInt(hours, 10);
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
        if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
      }
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const mIdx = months[monthStr.toLowerCase().slice(0, 3)];
      if (mIdx !== undefined) {
        d = new Date(Date.UTC(parseInt(year, 10), mIdx, parseInt(day, 10), h, parseInt(minutes, 10)));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
  } catch (e) {}

  return new Date().toISOString();
}
