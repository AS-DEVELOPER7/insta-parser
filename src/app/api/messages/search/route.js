import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const query = searchParams.get("query");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId parameter is required" },
        { status: 400 },
      );
    }

    if (!query || !query.trim()) {
      return NextResponse.json({ matches: [], count: 0 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Defense-in-depth IDOR check: Verify conversation ownership
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    const { data: matches, error } = await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_name, content, message_type, media_url, sent_at",
      )
      .eq("conversation_id", conversationId)
      .ilike("content", `%${query.trim()}%`)
      .order("sent_at", { ascending: false });

    if (error) {
      console.error("Error searching messages:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate search results (combining timezone-shifted duplicates)
    const uniqueMatches = [];
    const keptMap = new Map();

    for (const msg of matches || []) {
      const cleanContent = (msg.content || "").trim().toLowerCase();
      const mediaKey = msg.media_url || "";
      const sig = `${msg.sender_name}::${cleanContent || mediaKey}`;
      const timeMs = msg.sent_at ? new Date(msg.sent_at).getTime() : 0;

      if (!keptMap.has(sig)) {
        keptMap.set(sig, [timeMs]);
        uniqueMatches.push(msg);
      } else {
        const times = keptMap.get(sig);
        const isDup = times.some((t) => Math.abs(timeMs - t) / (1000 * 3600) <= 36);
        if (!isDup) {
          times.push(timeMs);
          uniqueMatches.push(msg);
        }
      }
    }

    // Fetch favorite status for this user & conversation to identify starred messages in search
    const { data: userFavorites } = await supabase
      .from("favorite_messages")
      .select("message_id, tag, note")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId);

    const favById = new Map();
    const favBySigAndTime = [];
    (userFavorites || []).forEach((fav) => {
      if (fav.message_id) {
        favById.set(fav.message_id, fav);
      }
    });

    for (const msg of matches || []) {
      if (favById.has(msg.id)) {
        const cleanContent = (msg.content || "").trim().toLowerCase();
        const mediaKey = msg.media_url || "";
        const sig = `${msg.sender_name}::${cleanContent || mediaKey}`;
        const timeMs = msg.sent_at ? new Date(msg.sent_at).getTime() : 0;
        favBySigAndTime.push({
          sig,
          timeMs,
          fav: favById.get(msg.id),
        });
      }
    }

    for (const msg of uniqueMatches) {
      let fav = favById.get(msg.id);

      if (!fav && favBySigAndTime.length > 0) {
        const cleanContent = (msg.content || "").trim().toLowerCase();
        const mediaKey = msg.media_url || "";
        const sig = `${msg.sender_name}::${cleanContent || mediaKey}`;
        const timeMs = msg.sent_at ? new Date(msg.sent_at).getTime() : 0;

        // ONLY match if it's the exact same sender + content AND within 36 hours (timezone shift)
        const matched = favBySigAndTime.find(
          (f) => f.sig === sig && Math.abs(timeMs - f.timeMs) / (1000 * 3600) <= 36
        );
        if (matched) {
          fav = matched.fav;
        }
      }

      msg.is_favorite = Boolean(fav);
      msg.favorite_tag = fav ? (fav.tag || "General") : null;
      msg.favorite_note = fav ? (fav.note || null) : null;
      if (fav && fav.message_id) {
        msg.favorite_message_id = fav.message_id;
      }
    }

    return NextResponse.json({
      matches: uniqueMatches,
      count: uniqueMatches.length,
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
