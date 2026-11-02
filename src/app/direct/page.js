"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MainLayoutTemplate from "@/components/templates/MainLayoutTemplate";
import ChatThreadList from "@/components/organisms/direct/ChatThreadList";
import ChatWindow from "@/components/organisms/direct/ChatWindow";
import ChatSkeleton from "@/components/molecules/direct/ChatSkeleton";
import {
  useLazyGetProfileQuery,
  useLazyGetConversationsQuery,
  useLazyGetMessagesQuery,
} from "@/store/api/apiSlice";

function DirectPageContent() {
  const searchParams = useSearchParams();
  const urlConvId = searchParams.get("conversationId");
  const urlMsgId = searchParams.get("messageId");

  const [triggerGetProfile, { data: profileData }] = useLazyGetProfileQuery();
  const [
    triggerGetConversations,
    { data: convsData, isLoading: isConvsLoading },
  ] = useLazyGetConversationsQuery();

  const conversations = convsData?.conversations || [];
  const [activeConvId, setActiveConvId] = useState(urlConvId || null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [
    triggerGetMessages,
    { data: msgsData, isLoading: isMsgsLoading, isFetching: isMsgsFetching },
  ] = useLazyGetMessagesQuery();

  useEffect(() => {
    triggerGetProfile("", true);
    triggerGetConversations("", true);
  }, [triggerGetProfile, triggerGetConversations]);

  // Synchronize URL conversationId if provided
  useEffect(() => {
    if (urlConvId) {
      setActiveConvId(urlConvId);
    }
  }, [urlConvId]);

  // Auto-select first conversation on desktop screens (>=768px) only if none targeted
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      if (conversations.length > 0 && !activeConvId && !urlConvId) {
        setActiveConvId(conversations[0].id);
      }
    }
  }, [conversations, activeConvId, urlConvId]);

  useEffect(() => {
    if (activeConvId) {
      triggerGetMessages({ conversationId: activeConvId, limit: 200 }, true);
      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
      }
    }
  }, [activeConvId, triggerGetMessages]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isChatLoading = isMsgsLoading || isMsgsFetching;
  const messages = msgsData?.messages || [];
  const userProfile = profileData?.profile;

  return (
    <MainLayoutTemplate
      userProfile={userProfile}
      hideMobileNav={!!activeConvId}
    >
      {/* Full-height chat layout — exact 100dvh mobile height prevents outer window double scroll */}
      <div
        className={`flex ${activeConvId ? "h-[100dvh]" : "h-[calc(100dvh-4rem)]"} md:h-screen overflow-hidden`}
      >
        {isConvsLoading ? (
          <ChatSkeleton />
        ) : (
          <>
            {/* Screen 1: Thread List (Full width on mobile when no active chat) */}
            <div
              className={`${activeConvId ? "hidden md:flex" : "w-full flex"} md:w-auto`}
            >
              <ChatThreadList
                conversations={conversations}
                activeConvId={activeConvId}
                onSelectConversation={(id) => setActiveConvId(id)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              />
            </div>

            {/* Screen 2: Chat Window (Full width on mobile when active chat selected) */}
            <div
              className={`${activeConvId ? "w-full flex" : "hidden md:flex"} flex-1`}
            >
              <ChatWindow
                activeConv={activeConv}
                messages={messages}
                isLoading={isChatLoading}
                onBack={() => setActiveConvId(null)}
                initialTargetMessageId={urlMsgId}
              />
            </div>
          </>
        )}
      </div>
    </MainLayoutTemplate>
  );
}

export default function DirectPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-white dark:bg-black flex items-center justify-center">
          <ChatSkeleton />
        </div>
      }
    >
      <DirectPageContent />
    </Suspense>
  );
}
