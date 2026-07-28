import JSZip from 'jszip';
export { decodeIgText } from './jsonDecoder';

export async function resolveZipStructure(zipFile) {
  const zip = new JSZip();
  const contents = await zip.loadAsync(zipFile);

  const fileNames = Object.keys(contents.files).filter(
    (name) => !contents.files[name].dir
  );

  console.log('ZIP loaded. Total files found:', fileNames.length);

  let isHtml = false;
  let isJson = false;

  const postFiles = [];
  const storyFiles = [];
  const reelFiles = [];
  const commentFiles = [];
  const messageFiles = [];
  const connectionFiles = [];
  const loggedInfoFiles = [];
  const preferenceFiles = [];
  const personalInfoFiles = [];
  const mediaFiles = {};

  const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.mp4', '.mov', '.m4a', '.mp3', '.ogg', '.wav'];

  // Excluded top-level folders per user rules:
  // - security_and_login_information
  // - ads_information
  // - apps_and_websites_off_of_instagram
  const isExcluded = (lowerPath) =>
    lowerPath.includes('security_and_login_information') ||
    lowerPath.includes('apps_and_websites_off_of_instagram');

  fileNames.forEach((path) => {
    const lower = path.toLowerCase();
    const filename = path.split('/').pop().toLowerCase();

    if (isExcluded(lower)) return;

    if (lower.endsWith('.json')) isJson = true;
    if (lower.endsWith('.html')) isHtml = true;

    // Index all media files under media/ directory
    const isMedia = MEDIA_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (isMedia) {
      mediaFiles[lower] = contents.files[path];
      mediaFiles[filename] = contents.files[path];

      const parts = path.split('/');
      if (parts.length >= 2) {
        const lastTwo = parts.slice(-2).join('/').toLowerCase();
        mediaFiles[lastTwo] = contents.files[path];
      }
      if (parts.length >= 3) {
        const lastThree = parts.slice(-3).join('/').toLowerCase();
        mediaFiles[lastThree] = contents.files[path];
      }
    }

    // Index JSON / HTML data files according to strict rules
    if (lower.endsWith('.json') || lower.endsWith('.html')) {
      if (lower.includes('messages/') || lower.includes('inbox/')) {
        messageFiles.push(path);
      } else if (lower.includes('personal_information/personal_information.json') || lower.endsWith('personal_information.json')) {
        personalInfoFiles.push(path);
      } else if (
        lower.includes('connections/') ||
        lower.includes('followers_and_following/') ||
        lower.includes('follower') ||
        lower.includes('following') ||
        lower.includes('blocked') ||
        lower.includes('close_friend') ||
        lower.includes('follow_request') ||
        lower.includes('hide_story')
      ) {
        connectionFiles.push(path);
      } else if (lower.includes('logged_information/')) {
        loggedInfoFiles.push(path);
      } else if (lower.includes('preferences/')) {
        preferenceFiles.push(path);
      } else if (
        !lower.includes('interested') &&
        !lower.includes('deleted') &&
        !lower.includes('liked') &&
        !lower.includes('comment') &&
        (
          lower.includes('media/posts') ||
          lower.includes('your_posts') ||
          lower.includes('content/posts') ||
          lower.endsWith('/posts.json') ||
          lower.endsWith('posts.json') ||
          /\/posts_\d+\.json$/i.test(lower)
        )
      ) {
        postFiles.push(path);
      } else if (
        lower.includes('content/stories') ||
        lower.includes('your_stories') ||
        lower.includes('stories_') ||
        lower.endsWith('stories.json') ||
        lower.endsWith('stories.html') ||
        (lower.includes('stories') && (lower.endsWith('.json') || lower.endsWith('.html')))
      ) {
        storyFiles.push(path);
      }
    }
  });

  const format = isJson ? 'json' : isHtml ? 'html' : 'unknown';

  const followerFiles = connectionFiles.filter((f) => f.toLowerCase().includes('follower'));
  const followingFiles = connectionFiles.filter((f) => f.toLowerCase().includes('following'));

  return {
    zip,
    format,
    totalFiles: fileNames.length,
    messageFiles,
    personalInfoFiles,
    connectionFiles,
    followerFiles,
    followingFiles,
    loggedInfoFiles,
    preferenceFiles,
    mediaFiles,
    postFiles,
    storyFiles,
  };
}

export function findMediaInZip(uri, mediaFiles, zip, threadFolderId = '') {
  if (!uri) return null;

  const cleanUri = uri.replace(/^(\.\/|\/)/, '');
  const lowerUri = cleanUri.toLowerCase();
  const filename = cleanUri.split('/').pop().toLowerCase();

  // 1. Direct match in indexed media dictionary
  if (mediaFiles[lowerUri]) return mediaFiles[lowerUri];
  if (mediaFiles[filename]) return mediaFiles[filename];

  // 2. Thread-specific path match (e.g. udaipurwale_4891764450892608/photos/123.jpg)
  if (threadFolderId) {
    const threadSubpath = `${threadFolderId}/${lowerUri}`.toLowerCase();
    if (mediaFiles[threadSubpath]) return mediaFiles[threadSubpath];

    const lastTwoThread = `${threadFolderId}/${cleanUri.split('/').slice(-2).join('/')}`.toLowerCase();
    if (mediaFiles[lastTwoThread]) return mediaFiles[lastTwoThread];
  }

  // 3. Fallback search across all files in ZIP ending with filename
  const zipKeys = Object.keys(zip.files);
  const matchingKey = zipKeys.find((key) => key.toLowerCase().endsWith(filename));
  if (matchingKey) return zip.files[matchingKey];

  console.warn('Could not locate media file in ZIP:', uri, 'filename:', filename);
  return null;
}

export async function inspectZipThreads(file, userId) {
  const zip = await JSZip.loadAsync(file);
  const fileNames = Object.keys(zip.files);

  const isJson = fileNames.some((f) => f.endsWith('.json') && f.includes('messages/'));
  const format = isJson ? 'json' : 'html';

  const threadMap = new Map();

  for (const filePath of fileNames) {
    const lower = filePath.toLowerCase();
    if (!lower.endsWith('.json') && !lower.endsWith('.html')) continue;
    if (!lower.includes('messages/') && !lower.includes('inbox/')) continue;

    const parts = filePath.split('/');
    if (parts.length < 2) continue;
    const threadFolderId = parts[parts.length - 2];
    if (!threadFolderId || threadFolderId === 'messages' || threadFolderId === 'inbox') continue;

    if (!threadMap.has(threadFolderId)) {
      let displayName = threadFolderId.split('_')[0] || threadFolderId;
      threadMap.set(threadFolderId, {
        threadFolderId,
        participantName: displayName,
        fileCount: 0,
      });
    }

    const item = threadMap.get(threadFolderId);
    item.fileCount += 1;

    // Read title or participants from message file until real participant name is decoded
    if (!item.hasRealName) {
      try {
        const isPrimaryFile =
          lower.endsWith('message_1.json') ||
          lower.endsWith('message_1.html') ||
          lower.endsWith('message.json') ||
          lower.endsWith('message.html');

        if (isPrimaryFile || !item.hasTriedFile) {
          item.hasTriedFile = true;
          const content = await zip.files[filePath].async('string');

          if (lower.endsWith('.json')) {
            let candidateName = null;
            const contentSnippet = content.slice(0, 8000);

            // 1. Try "title": "..."
            const titleMatch = contentSnippet.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
            if (titleMatch && titleMatch[1]) {
              try {
                candidateName = decodeIgText(JSON.parse(`"${titleMatch[1]}"`));
              } catch (e) {
                candidateName = decodeIgText(titleMatch[1]);
              }
            }

            // 2. Try "participants": [ { "name": "..." } ]
            if (!candidateName) {
              const partMatch = contentSnippet.match(/"participants"\s*:\s*\[\s*\{\s*"name"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
              if (partMatch && partMatch[1]) {
                try {
                  candidateName = decodeIgText(JSON.parse(`"${partMatch[1]}"`));
                } catch (e) {
                  candidateName = decodeIgText(partMatch[1]);
                }
              }
            }

            // 3. Try "sender_name": "..."
            if (!candidateName) {
              const senderMatch = contentSnippet.match(/"sender_name"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
              if (senderMatch && senderMatch[1]) {
                try {
                  candidateName = decodeIgText(JSON.parse(`"${senderMatch[1]}"`));
                } catch (e) {
                  candidateName = decodeIgText(senderMatch[1]);
                }
              }
            }

            // 4. Fallback to full JSON parse
            if (!candidateName) {
              try {
                const parsed = JSON.parse(content);
                const title = parsed.title || parsed.participants?.[0]?.name || parsed.messages?.find((m) => m.sender_name)?.sender_name;
                if (title) candidateName = decodeIgText(title);
              } catch (e) {}
            }

            if (candidateName) {
              item.participantName = candidateName;
              item.hasRealName = true;
            }
          } else {
            const titleMatch =
              content.match(/<div class="_3-96 _2pio _2lek _2lel">(.*?)<\/div>/i) ||
              content.match(/<title>(.*?)<\/title>/i) ||
              content.match(/<h1>(.*?)<\/h1>/i);
            if (titleMatch && titleMatch[1]) {
              const cleanTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
              if (cleanTitle) {
                item.participantName = cleanTitle;
                item.hasRealName = true;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error reading thread title:', e);
      }
    }
  }

  // Check Supabase for existing conversations
  let existingFolders = new Set();
  let existingNames = new Set();
  if (userId) {
    try {
      const { createClient } = await import('../supabase/client');
      const supabase = createClient();
      const { data: existingConvs } = await supabase
        .from('conversations')
        .select('thread_folder_id, participant_name')
        .eq('user_id', userId);

      if (existingConvs) {
        existingConvs.forEach((c) => {
          if (c.thread_folder_id) existingFolders.add(c.thread_folder_id);
          if (c.participant_name) existingNames.add(c.participant_name.toLowerCase());
        });
      }
    } catch (e) {}
  }

  const threadsList = Array.from(threadMap.values()).map((t) => ({
    ...t,
    existsInDb: existingFolders.has(t.threadFolderId) || existingNames.has(t.participantName.toLowerCase()),
  }));

  return { format, threads: threadsList };
}
