import { decodeIgText } from './jsonDecoder';

export async function parsePosts(zipContext, onProgress) {
  const { zip, format, postFiles, mediaFiles } = zipContext;
  const parsedPosts = [];

  for (let i = 0; i < postFiles.length; i++) {
    const filePath = postFiles[i];
    const fileEntry = zip.files[filePath];
    if (!fileEntry) continue;

    const fileContent = await fileEntry.async('string');

    if (format === 'json') {
      try {
        const jsonData = JSON.parse(fileContent);
        const rawPosts = Array.isArray(jsonData)
          ? jsonData
          : jsonData.ig_posts || jsonData.posts || [jsonData];

        for (const item of rawPosts) {
          if (!item || typeof item !== 'object') continue;

          // Extract media list (handles top-level media array OR label_values Media array OR single uri)
          let rawMediaList = [];
          if (Array.isArray(item.media) && item.media.length > 0) {
            rawMediaList = item.media;
          } else if (Array.isArray(item.label_values)) {
            const mediaLabel = item.label_values.find(
              (l) => (l.label === 'Media' || l.title === 'Media') && Array.isArray(l.media)
            );
            if (mediaLabel) {
              rawMediaList = mediaLabel.media;
            }
          } else if (item.uri) {
            rawMediaList = [item];
          } else if (item.media_properties) {
            rawMediaList = [item.media_properties];
          }

          const mediaItems = [];
          let extractedTitle = '';

          for (const m of rawMediaList) {
            const uri = m.uri || m.path || (m.media_properties && m.media_properties.uri);
            if (!uri) continue;

            if (m.title && !extractedTitle) extractedTitle = m.title;

            const cleanUri = uri.replace(/^(\.\/|\/)/, '');
            const matchingFile = findMediaInZip(cleanUri, mediaFiles, zip);

            mediaItems.push({
              uri: cleanUri,
              zipEntry: matchingFile || null,
              mediaType: cleanUri.toLowerCase().endsWith('.mp4') || cleanUri.toLowerCase().endsWith('.mov') ? 'video' : 'image',
            });
          }

          if (mediaItems.length === 0) continue;

          const captionLabelVal = Array.isArray(item.label_values)
            ? item.label_values.find((l) => l.label === 'Caption')?.value
            : null;

          const rawCaption = item.title || item.caption || item.text || extractedTitle || captionLabelVal || '';
          const caption = decodeIgText(rawCaption);

          const creationTimeLabelVal = Array.isArray(item.label_values)
            ? item.label_values.find((l) => l.label === 'Creation time')?.timestamp_value
            : null;

          const timestampNum =
            item.timestamp ||
            item.creation_timestamp ||
            item.taken_at ||
            (rawMediaList[0] && rawMediaList[0].creation_timestamp) ||
            creationTimeLabelVal;

          let takenAt = new Date().toISOString();
          if (timestampNum) {
            const tsMs = timestampNum < 10000000000 ? timestampNum * 1000 : timestampNum;
            takenAt = new Date(tsMs).toISOString();
          }

          const location = item.location ? decodeIgText(item.location.name || item.location) : null;

          parsedPosts.push({
            caption,
            takenAt,
            location,
            exportFormat: 'json',
            mediaItems,
          });
        }
      } catch (e) {
        console.error('Failed to parse JSON post file:', filePath, e);
      }
    } else if (format === 'html') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(fileContent, 'text/html');

        let postNodes = doc.querySelectorAll('div._a6-g, div.pam, div.post, div.media_file, div._a6-h');
        if (postNodes.length === 0) {
          postNodes = doc.querySelectorAll('div');
        }

        postNodes.forEach((div) => {
          const imgTags = div.querySelectorAll('img[src], video[src]');
          if (imgTags.length === 0) return;

          const textSpan = div.querySelector('span, div._a6-h, div.caption');
          const timeSpan = div.querySelector('span.timestamp, div._a6-i, span.time');

          const caption = textSpan ? textSpan.textContent.trim() : '';
          const timeStr = timeSpan ? timeSpan.textContent.trim() : '';
          const takenAt = parseHtmlTimestamp(timeStr);

          const mediaItems = [];
          imgTags.forEach((el) => {
            const src = el.getAttribute('src');
            if (src && !src.startsWith('data:')) {
              const cleanUri = src.replace(/^(\.\/|\/)/, '');
              const matchingFile = findMediaInZip(cleanUri, mediaFiles, zip);
              mediaItems.push({
                uri: cleanUri,
                zipEntry: matchingFile || null,
                mediaType: src.toLowerCase().endsWith('.mp4') ? 'video' : 'image',
              });
            }
          });

          if (mediaItems.length > 0) {
            parsedPosts.push({
              caption,
              takenAt,
              location: null,
              exportFormat: 'html',
              mediaItems,
            });
          }
        });
      } catch (e) {
        console.error('Failed to parse HTML post file:', filePath, e);
      }
    }

    if (onProgress) {
      onProgress({
        phase: 'posts',
        current: i + 1,
        total: postFiles.length,
        itemsParsed: parsedPosts.length,
      });
    }
  }

  // Deduplicate posts that share the same first media URI or Instagram media ID
  const postMap = new Map();

  for (const post of parsedPosts) {
    const firstUri = post.mediaItems[0]?.uri;
    if (!firstUri) continue;

    const idMatch = firstUri.match(/17\d{14,15}/);
    const key = idMatch ? idMatch[0] : firstUri.split('/').pop().toLowerCase();
    const existing = postMap.get(key);

    if (!existing) {
      postMap.set(key, post);
    } else {
      // If new post has more media items (carousel), prefer it
      if (post.mediaItems.length > existing.mediaItems.length) {
        if (!post.caption && existing.caption) post.caption = existing.caption;
        postMap.set(key, post);
      } else {
        if (!existing.caption && post.caption) existing.caption = post.caption;
      }
    }
  }

  const deduplicatedPosts = Array.from(postMap.values());
  console.log(`Total parsed posts: ${parsedPosts.length}, Deduplicated: ${deduplicatedPosts.length}`);
  return deduplicatedPosts;
}

function findMediaInZip(uri, mediaFiles, zip) {
  const lower = uri.toLowerCase();
  const filename = uri.split('/').pop().toLowerCase();

  return (
    mediaFiles[lower] ||
    mediaFiles[filename] ||
    zip.files[uri] ||
    zip.files[Object.keys(zip.files).find((k) => k.toLowerCase().endsWith(filename))] ||
    null
  );
}

function parseHtmlTimestamp(str) {
  if (!str) return new Date().toISOString();
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (e) {}
  return new Date().toISOString();
}
