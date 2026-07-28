"use client";

import { useEffect } from "react";
import MainLayoutTemplate from "@/components/templates/MainLayoutTemplate";
import ActivityLogSection from "@/components/organisms/activity/ActivityLogSection";
import {
  useLazyGetProfileQuery,
  useLazyGetActivityLogQuery,
} from "@/store/api/apiSlice";

export default function ActivityLogPage() {
  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const [triggerGetActivityLog, { data: activityData, isLoading }] =
    useLazyGetActivityLogQuery();

  const userProfile = profileData?.profile;

  useEffect(() => {
    triggerGetProfile("", true);
    triggerGetActivityLog("", true);
  }, [triggerGetProfile, triggerGetActivityLog]);

  return (
    <MainLayoutTemplate userProfile={userProfile}>
      <ActivityLogSection
        recentSearches={activityData?.recentSearches || []}
        linkHistory={activityData?.linkHistory || []}
        isLoading={isLoading}
      />
    </MainLayoutTemplate>
  );
}
