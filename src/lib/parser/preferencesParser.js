import { decodeIgText } from './jsonDecoder';

export async function parsePersonalInformation(zipContext) {
  try {
    const files = zipContext.personalInfoFiles || [];
    for (const personalFile of files) {
      if (!zipContext.zip.files[personalFile]) continue;

      const content = await zipContext.zip.files[personalFile].async('string');
      const data = JSON.parse(content);
      const userObj = Array.isArray(data.profile_user) ? data.profile_user[0] : (data.profile_user || data);
      if (!userObj) continue;

      const stringData = userObj.string_map_data || {};
      const mediaData = userObj.media_map_data || {};

      const profilePicObj = mediaData['Profile photo'] || mediaData['profile_photo'] || mediaData['Profile Photo'] || mediaData['Avatar'] || {};
      const profilePicUri = profilePicObj?.uri || profilePicObj?.path || '';

      const username = decodeIgText(stringData['Username']?.value || stringData['username']?.value || '');
      const fullName = decodeIgText(stringData['Name']?.value || stringData['name']?.value || '');
      const bio = decodeIgText(stringData['Bio']?.value || stringData['bio']?.value || '');

      if (username || fullName || bio) {
        return {
          username,
          fullName,
          email: stringData['Email address']?.value || stringData['Email']?.value || '',
          phone: stringData['Phone number']?.value || stringData['Phone']?.value || '',
          bio,
          gender: stringData['Gender']?.value || '',
          dob: stringData['Date of birth']?.value || '',
          website: stringData['Website']?.value || '',
          isPrivate: stringData['Private account']?.value?.toLowerCase() === 'true',
          profilePicUri,
        };
      }
    }
    return null;
  } catch (err) {
    console.error('Error parsing personal information:', err);
    return null;
  }
}

export async function parseAdsInformation(zipContext) {
  const result = {
    adsViewed: [],
    profilesNotInterested: [],
    adPreferences: [],
  };

  if (!zipContext?.zip) return result;

  const zip = zipContext.zip;
  const fileKeys = Object.keys(zip.files);

  for (const key of fileKeys) {
    const lower = key.toLowerCase();

    // 1. Ads Viewed
    if (lower.includes('ads_viewed.json')) {
      try {
        const content = await zip.files[key].async('string');
        const rawAds = JSON.parse(content);
        if (Array.isArray(rawAds)) {
          result.adsViewed = rawAds.map((item) => {
            const labels = item.label_values || [];
            const getVal = (lbl) => labels.find((l) => l.label === lbl)?.value || '';

            const ownerObj = labels.find((l) => l.title === 'Owner')?.dict?.[0]?.dict || [];
            const getOwnerVal = (lbl) => ownerObj.find((l) => l.label === lbl)?.value || '';

            return {
              timestamp: item.timestamp,
              fbid: item.fbid || '',
              url: getVal('URL') || labels.find((l) => l.label === 'URL')?.href || '',
              caption: decodeIgText(getVal('Caption')),
              title: decodeIgText(getVal('Title')),
              adLibraryUrl: getVal('Ad library public URL') || labels.find((l) => l.label === 'Ad library public URL')?.href || '',
              ownerName: decodeIgText(getOwnerVal('Name')),
              ownerUsername: decodeIgText(getOwnerVal('Username')),
              ownerUrl: getOwnerVal('URL'),
            };
          });
        }
      } catch (e) {
        console.error('Error parsing ads_viewed.json:', e);
      }
    }

    // 2. Profiles Not Interested In
    if (lower.includes('profiles_you\'re_not_interested_in.json') || lower.includes('profiles_youre_not_interested_in.json')) {
      try {
        const content = await zip.files[key].async('string');
        const rawProfiles = JSON.parse(content);
        if (Array.isArray(rawProfiles)) {
          result.profilesNotInterested = rawProfiles.map((item) => {
            const labels = item.label_values || [];
            const getVal = (lbl) => labels.find((l) => l.label === lbl)?.value || '';

            return {
              timestamp: item.timestamp,
              fbid: item.fbid || '',
              username: decodeIgText(getVal('Username')),
              name: decodeIgText(getVal('Name')),
              url: getVal('URL'),
            };
          });
        }
      } catch (e) {
        console.error('Error parsing profiles_not_interested:', e);
      }
    }

    // 3. Ad Preferences
    if (lower.includes('ad_preferences.json')) {
      try {
        const content = await zip.files[key].async('string');
        const rawObj = JSON.parse(content);
        const dictList = rawObj?.label_values?.find((l) => Array.isArray(l.dict))?.dict || [];

        result.adPreferences = dictList.map((entry) => {
          const dict = entry.dict || [];
          const eventVal = dict.find((d) => d.label === 'Event')?.value || 'Hide an Ad';
          const adTitle = dict.find((d) => d.label === 'Ad title')?.value || '';
          const creationTimestamp = dict.find((d) => d.label === 'Creation time')?.timestamp_value || 0;

          return {
            event: eventVal,
            adTitle: decodeIgText(adTitle),
            timestamp: creationTimestamp,
          };
        });
      } catch (e) {
        console.error('Error parsing ad_preferences.json:', e);
      }
    }
  }

  return result;
}
