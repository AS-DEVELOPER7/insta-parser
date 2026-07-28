import { decodeIgText } from './jsonDecoder';

export async function parseActivityLogs(zipContext) {
  const { zip, loggedInfoFiles = [] } = zipContext;
  const activityLogs = [];

  for (const filePath of loggedInfoFiles) {
    const fileEntry = zip.files[filePath];
    if (!fileEntry) continue;

    const lowerPath = filePath.toLowerCase();
    const isJson = lowerPath.endsWith('.json');
    const fileContent = await fileEntry.async('string');

    if (lowerPath.includes('link_history')) {
      if (isJson) {
        try {
          const jsonData = JSON.parse(fileContent);
          const list = Array.isArray(jsonData) ? jsonData : Object.values(jsonData).flat();

          for (const item of list) {
            if (!item) continue;
            let url = '';
            let title = '';
            let timestampNum = item.timestamp;

            if (item.label_values && Array.isArray(item.label_values)) {
              const urlLv = item.label_values.find((lv) =>
                lv.label?.toLowerCase().includes('website link') || lv.label?.toLowerCase().includes('url')
              );
              const titleLv = item.label_values.find((lv) =>
                lv.label?.toLowerCase().includes('title')
              );

              url = urlLv?.value || '';
              title = titleLv?.value || '';
            }

            if (!url) {
              url = item.value || item.href || item.url || '';
            }

            if (url) {
              const createdAt = timestampNum
                ? new Date(timestampNum * 1000).toISOString()
                : new Date().toISOString();

              activityLogs.push({
                type: 'link',
                title: decodeIgText(title || url),
                value: url,
                createdAt,
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse link_history JSON:', filePath, e);
        }
      }
    } else if (lowerPath.includes('recent_searches') || lowerPath.includes('search')) {
      if (isJson) {
        try {
          const jsonData = JSON.parse(fileContent);
          let list = [];

          if (Array.isArray(jsonData)) {
            list = jsonData;
          } else if (typeof jsonData === 'object' && jsonData !== null) {
            Object.values(jsonData).forEach((val) => {
              if (Array.isArray(val)) list.push(...val);
            });
          }

          for (const item of list) {
            if (!item) continue;
            const query = decodeIgText(item.title || item.value || item.string_list_data?.[0]?.value || '');
            const timestampNum = item.string_list_data?.[0]?.timestamp || item.timestamp;

            if (query) {
              const createdAt = timestampNum
                ? new Date(timestampNum * 1000).toISOString()
                : new Date().toISOString();

              activityLogs.push({
                type: 'search',
                title: query,
                value: query,
                createdAt,
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse search history JSON:', filePath, e);
        }
      }
    }
  }

  return activityLogs;
}
