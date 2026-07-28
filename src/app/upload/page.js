"use client";

import { useEffect } from "react";
import MainLayoutTemplate from "@/components/templates/MainLayoutTemplate";
import UploadDashboard from "@/components/organisms/upload/UploadDashboard";
import { useLazyGetProfileQuery } from "@/store/api/apiSlice";

export default function UploadPage() {
  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const userProfile = profileData?.profile;

  useEffect(() => {
    triggerGetProfile("", true);
  }, [triggerGetProfile]);

  return (
    <MainLayoutTemplate userProfile={userProfile}>
      <UploadDashboard />
    </MainLayoutTemplate>
  );
}
