import { decodeIgText } from './jsonDecoder';

export async function parseStories(zipContext, onProgress) {
  const { zip, format, storyFiles, mediaFiles } = zipContext;
  const parsedStories = [];

  for (let i = 0; i < storyFiles.length; i++) {
    const filePath = storyFiles[i];
    const fileEntry = zip.files[filePath];
    if (!fileEntry) continue;

    const fileContent = await fileEntry.async('string');

    if (format === 'json') {
      try {
        const jsonData = JSON.parse(fileContent);
        const storiesList = Array.isArray(jsonData)
          ? jsonData
          : jsonData.ig_stories || jsonData.stories || [];

        for (const item of storiesList) {
          const timestampNum = item.creation_timestamp || item.taken_at || item.timestamp;
          let takenAt = new Date().toISOString();
          if (timestampNum) {
            const tsMs = timestampNum < 10000000000 ? timestampNum * 1000 : timestampNum;
            takenAt = new Date(tsMs).toISOString();
          }

          const uri = item.uri || item.path || (item.media_properties && item.media_properties.uri);

          if (uri) {
            const cleanUri = uri.replace(/^(\.\/|\/)/, '');
            const filename = cleanUri.split('/').pop().toLowerCase();
            const matchingFile =
              mediaFiles[cleanUri] ||
              mediaFiles[filename] ||
              zip.files[cleanUri] ||
              zip.files[Object.keys(zip.files).find((k) => k.toLowerCase().endsWith(filename))];

            parsedStories.push({
              takenAt,
              mediaUri: cleanUri,
              zipEntry: matchingFile || null,
              mediaType: cleanUri.toLowerCase().endsWith('.mp4') || cleanUri.toLowerCase().endsWith('.mov') ? 'video' : 'image',
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse JSON story file:', filePath, e);
      }
    } else if (format === 'html') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(fileContent, 'text/html');
        const nodes = doc.querySelectorAll('div._a6-g, div.pam');

        nodes.forEach((node) => {
          const img = node.querySelector('img[src], video[src]');
          const timeEl = node.querySelector('span.timestamp, div._a6-i');
          const timeStr = timeEl ? timeEl.textContent.trim() : '';

          if (img) {
            const src = img.getAttribute('src');
            if (src) {
              const cleanUri = src.replace(/^(\.\/|\/)/, '');
              const filename = cleanUri.split('/').pop().toLowerCase();
              const matchingFile =
                mediaFiles[cleanUri] ||
                mediaFiles[filename] ||
                zip.files[cleanUri] ||
                zip.files[Object.keys(zip.files).find((k) => k.toLowerCase().endsWith(filename))];

              parsedStories.push({
                takenAt: parseHtmlTime(timeStr),
                mediaUri: cleanUri,
                zipEntry: matchingFile || null,
                mediaType: src.toLowerCase().endsWith('.mp4') ? 'video' : 'image',
              });
            }
          }
        });
      } catch (e) {
        console.error('Failed to parse HTML story file:', filePath, e);
      }
    }

    if (onProgress) {
      onProgress({
        phase: 'stories',
        current: i + 1,
        total: storyFiles.length,
        itemsParsed: parsedStories.length,
      });
    }
  }

  console.log('Total parsed stories:', parsedStories.length);
  return parsedStories;
}

function parseHtmlTime(str) {
  if (!str) return new Date().toISOString();
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (e) {}
  return new Date().toISOString();
}
