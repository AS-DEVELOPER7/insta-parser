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

    return NextResponse.json({
      matches: matches || [],
      count: matches ? matches.length : 0,
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
