import { decodeIgText } from './jsonDecoder';

export async function parseConnections(zipContext, onProgress) {
  const { zip, connectionFiles = [] } = zipContext;
  const connections = [];

  for (const filePath of connectionFiles) {
    const fileEntry = zip.files[filePath];
    if (!fileEntry) continue;

    const lowerPath = filePath.toLowerCase();
    const filename = filePath.split('/').pop().toLowerCase();

    // Determine connection category type strictly
    let type = null;
    if (filename.includes('following')) {
      type = 'following';
    } else if (filename.includes('follower')) {
      type = 'follower';
    } else if (filename.includes('close_friend') || filename.includes('favorited')) {
      type = 'close_friend';
    } else if (filename.includes('blocked')) {
      type = 'blocked';
    } else if (
      filename.includes('follow_requests_you\'ve_received') ||
      filename.includes('follow_requests_received') ||
      filename.includes('received_follow_requests')
    ) {
      type = 'request';
    }

    // Skip non-connection files
    if (!type) continue;

    const isJson = lowerPath.endsWith('.json');
    const fileContent = await fileEntry.async('string');

    if (isJson) {
      try {
        const jsonData = JSON.parse(fileContent);

        let list = [];
        if (Array.isArray(jsonData)) {
          list = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
          if (jsonData.label_values || jsonData.string_list_data || jsonData.value || jsonData.title) {
            list = [jsonData];
          } else {
            // Extract array from root keys (e.g. relationships_followers, relationships_following, etc.)
            Object.values(jsonData).forEach((val) => {
              if (Array.isArray(val)) list.push(...val);
            });
          }
        }

        for (const item of list) {
          if (!item) continue;

          // 1. Check string_list_data array (followers_1.json, following.json, follow_requests)
          const stringListData = item.string_list_data || [];
          let targetUsername = stringListData[0]?.value || '';
          let timestampNum = stringListData[0]?.timestamp;

          // 2. Check label_values array (close_friends.json, blocked_profiles.json)
          if (!targetUsername && item.label_values && Array.isArray(item.label_values)) {
            const usernameLv = item.label_values.find(
              (lv) => lv.label?.toLowerCase() === 'username' && lv.value && lv.value.trim() !== ''
            );
            const nameLv = item.label_values.find(
              (lv) => lv.label?.toLowerCase() === 'name' && lv.value && lv.value.trim() !== ''
            );

            if (usernameLv?.value) {
              targetUsername = usernameLv.value;
            } else if (nameLv?.value) {
              targetUsername = nameLv.value;
            }
          }

          // 3. Fallbacks (direct value, title, name)
          if (!targetUsername) {
            targetUsername = item.value || item.title || item.name || '';
          }

          if (!timestampNum && item.timestamp) {
            timestampNum = item.timestamp;
          }

          const connectedAt = timestampNum
            ? new Date(timestampNum * 1000).toISOString()
            : new Date().toISOString();

          if (targetUsername) {
            connections.push({
              type,
              targetUsername: decodeIgText(targetUsername),
              connectedAt,
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse connections JSON:', filePath, e);
      }
    } else {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(fileContent, 'text/html');
        const links = doc.querySelectorAll('a[href*="instagram.com"]');

        links.forEach((a) => {
          const username = a.textContent.trim();
          if (username) {
            connections.push({
              type,
              targetUsername: username,
              connectedAt: new Date().toISOString(),
            });
          }
        });
      } catch (e) {
        console.error('Failed to parse connections HTML:', filePath, e);
      }
    }
  }

  if (onProgress) {
    onProgress({
      phase: 'connections',
      count: connections.length,
    });
  }

  return connections;
}
