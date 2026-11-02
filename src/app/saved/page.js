'use client';

import { useEffect } from 'react';
import MainLayoutTemplate from '@/components/templates/MainLayoutTemplate';
import SavedMessagesSection from '@/components/organisms/saved/SavedMessagesSection';
import { useLazyGetProfileQuery } from '@/store/api/apiSlice';

export default function SavedPage() {
  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const userProfile = profileData?.profile;

  useEffect(() => {
    triggerGetProfile('', true);
  }, [triggerGetProfile]);

  return (
    <MainLayoutTemplate userProfile={userProfile}>
      <SavedMessagesSection />
    </MainLayoutTemplate>
  );
}

