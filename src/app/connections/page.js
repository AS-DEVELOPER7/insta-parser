"use client";

import { useEffect } from "react";
import MainLayoutTemplate from "@/components/templates/MainLayoutTemplate";
import ConnectionsSection from "@/components/organisms/connections/ConnectionsSection";
import {
  useLazyGetProfileQuery,
  useLazyGetConnectionsQuery,
} from "@/store/api/apiSlice";

export default function ConnectionsPage() {
  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const [triggerGetConnections, { data: connectionsData, isLoading }] =
    useLazyGetConnectionsQuery();

  const userProfile = profileData?.profile;

  useEffect(() => {
    triggerGetProfile("", true);
    triggerGetConnections("all", true);
  }, [triggerGetProfile, triggerGetConnections]);

  return (
    <MainLayoutTemplate userProfile={userProfile}>
      <ConnectionsSection
        connections={connectionsData?.connections || []}
        counts={connectionsData?.counts || {}}
        isLoading={isLoading}
      />
    </MainLayoutTemplate>
  );
}
