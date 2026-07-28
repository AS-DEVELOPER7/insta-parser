"use client";

import { useEffect } from "react";
import MainLayoutTemplate from "@/components/templates/MainLayoutTemplate";
import PreferencesSection from "@/components/organisms/preferences/PreferencesSection";
import {
  useLazyGetProfileQuery,
  useLazyGetPreferencesQuery,
} from "@/store/api/apiSlice";

export default function PreferencesPage() {
  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const [triggerGetPreferences, { data: prefsData, isLoading }] =
    useLazyGetPreferencesQuery();

  const userProfile = profileData?.profile;

  useEffect(() => {
    triggerGetProfile("", true);
    triggerGetPreferences("", true);
  }, [triggerGetProfile, triggerGetPreferences]);

  return (
    <MainLayoutTemplate userProfile={userProfile}>
      <PreferencesSection
        adsViewed={prefsData?.adsViewed || []}
        profilesNotInterested={prefsData?.profilesNotInterested || []}
        adPreferences={prefsData?.adPreferences || []}
        isLoading={isLoading}
      />
    </MainLayoutTemplate>
  );
}
