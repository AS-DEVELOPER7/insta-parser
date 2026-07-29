import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all conversations for the authenticated user
    const { data: conversations, error: convErr } = await supabase
      .from("conversations")
      .select("id, participant_name")
      .eq("user_id", user.id);

    if (convErr) {
      console.error("Error fetching conversations for cleanup:", convErr);
      return NextResponse.json({ error: convErr.message }, { status: 500 });
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        success: true,
        cleanedCount: 0,
        conversationsScanned: 0,
      });
    }

    let totalCleanedCount = 0;
    const statsPerConv = [];

    // 2. Scan each conversation for duplicate message rows
    for (const conv of conversations) {
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      let allMessages = [];

      while (hasMore) {
        const { data, error } = await supabase
          .from("messages")
          .select(
            "id, sender_name, sent_at, content, media_url, media_type, message_type, share_url",
          )
          .eq("conversation_id", conv.id)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allMessages = allMessages.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      const existingSet = new Set();
      const duplicateIdsToDelete = [];

      for (const m of allMessages) {
        const timeKey = m.sent_at ? new Date(m.sent_at).getTime() : 0;
        const secondKey = Math.floor(timeKey / 1000);
        const cleanContent = (m.content || "").trim().toLowerCase();

        const exactKey = `${m.sender_name}_${timeKey}`;
        const secondContentKey = cleanContent
          ? `${m.sender_name}_${secondKey}_${cleanContent}`
          : null;
        const secondMediaKey = `${m.sender_name}_${secondKey}_${m.message_type || "text"}_${m.media_url || m.share_url || ""}`;

        const isDuplicate =
          existingSet.has(exactKey) ||
          (secondContentKey && existingSet.has(secondContentKey)) ||
          ((m.media_url || m.share_url) && existingSet.has(secondMediaKey));

        if (isDuplicate) {
          duplicateIdsToDelete.push(m.id);
        } else {
          existingSet.add(exactKey);
          if (secondContentKey) existingSet.add(secondContentKey);
          if (m.media_url || m.share_url) existingSet.add(secondMediaKey);
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        const DELETE_CHUNK_SIZE = 200;
        for (let d = 0; d < duplicateIdsToDelete.length; d += DELETE_CHUNK_SIZE) {
          const chunk = duplicateIdsToDelete.slice(d, d + DELETE_CHUNK_SIZE);
          await supabase.from("messages").delete().in("id", chunk);
        }

        totalCleanedCount += duplicateIdsToDelete.length;
        statsPerConv.push({
          participantName: conv.participant_name,
          cleanedCount: duplicateIdsToDelete.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalCleanedCount,
      conversationsScanned: conversations.length,
      details: statsPerConv,
    });
  } catch (err) {
    console.error("Cleanup API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
