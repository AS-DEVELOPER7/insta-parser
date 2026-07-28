"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayoutTemplate from "@/components/templates/MainLayoutTemplate";
import Skeleton from "@/components/atoms/Skeleton";
import ProfileHeader from "@/components/organisms/profile/ProfileHeader";
import ProfileTabContent from "@/components/organisms/profile/ProfileTabContent";
import { createClient } from "@/lib/supabase/client";
import { useLazyGetProfileQuery } from "@/store/api/apiSlice";

export default function PersonalProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [triggerGetProfile, { data: profileData, isLoading }] =
    useLazyGetProfileQuery();
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedMedia, setSelectedMedia] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    triggerGetProfile("", true);
  }, [triggerGetProfile]);

  const profile = profileData?.profile;
  const posts = profileData?.posts || [];
  const stories = profileData?.stories || [];
  const stats = profileData?.stats || {
    postsCount: posts.length,
    storiesCount: stories.length,
    followersCount: 0,
    followingCount: 0,
  };

  if (isLoading || !profileData) {
    return (
      <MainLayoutTemplate userProfile={null}>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>
        </div>
      </MainLayoutTemplate>
    );
  }

  return (
    <MainLayoutTemplate userProfile={profile}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <ProfileHeader
          profile={profile}
          stats={stats}
          onLogout={handleLogout}
        />
        <ProfileTabContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          posts={posts}
          stories={stories}
          profile={profile || {}}
          selectedMedia={selectedMedia}
          setSelectedMedia={setSelectedMedia}
        />
      </div>
    </MainLayoutTemplate>
  );
}
