import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const tag = searchParams.get('tag');
    const query = searchParams.get('query');

    let dbQuery = supabase
      .from('favorite_messages')
      .select(`
        id,
        user_id,
        message_id,
        conversation_id,
        tag,
        note,
        created_at,
        message:messages!inner(
          id,
          conversation_id,
          sender_name,
          content,
          media_url,
          media_type,
          message_type,
          reactions,
          share_url,
          share_text,
          sent_at
        ),
        conversation:conversations!inner(
          id,
          participant_name,
          owner_username
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (conversationId) {
      dbQuery = dbQuery.eq('conversation_id', conversationId);
    }

    if (tag && tag.toLowerCase() !== 'all') {
      dbQuery = dbQuery.eq('tag', tag);
    }

    const { data: rawFavorites, error } = await dbQuery;

    if (error) {
      console.error('Error fetching favorites:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let favorites = rawFavorites || [];

    // Filter by search query if provided
    if (query && query.trim()) {
      const q = query.toLowerCase();
      favorites = favorites.filter((f) => {
        const contentMatch = f.message?.content?.toLowerCase().includes(q);
        const senderMatch = f.message?.sender_name?.toLowerCase().includes(q);
        const participantMatch = f.conversation?.participant_name?.toLowerCase().includes(q);
        const noteMatch = f.note?.toLowerCase().includes(q);
        const tagMatch = f.tag?.toLowerCase().includes(q);
        return contentMatch || senderMatch || participantMatch || noteMatch || tagMatch;
      });
    }

    // Extract all favorite message IDs for quick lookup in chat
    const favoriteMessageIds = (rawFavorites || []).map((f) => f.message_id);

    // Extract all unique tags used by this user
    const userTagsSet = new Set(['General']);
    (rawFavorites || []).forEach((f) => {
      if (f.tag) userTagsSet.add(f.tag);
    });

    return NextResponse.json({
      favorites,
      count: favorites.length,
      favoriteMessageIds,
      tags: Array.from(userTagsSet),
    });
  } catch (err) {
    console.error('Error in GET /api/favorites:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, conversationId, tag = 'General', note = null } = body || {};

    if (!messageId || !conversationId) {
      return NextResponse.json(
        { error: 'messageId and conversationId are required' },
        { status: 400 }
      );
    }

    // Verify that conversationId belongs to the authenticated user (IDOR prevention)
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('favorite_messages')
      .upsert(
        {
          user_id: user.id,
          message_id: messageId,
          conversation_id: conversationId,
          tag: tag || 'General',
          note: note || null,
        },
        { onConflict: 'user_id,message_id' }
      )
      .select(`
        id,
        user_id,
        message_id,
        conversation_id,
        tag,
        note,
        created_at
      `)
      .single();

    if (error) {
      console.error('Error adding favorite message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, favorite: data });
  } catch (err) {
    console.error('Error in POST /api/favorites:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId query parameter is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('favorite_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('message_id', messageId);

    if (error) {
      console.error('Error removing favorite message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, removedMessageId: messageId });
  } catch (err) {
    console.error('Error in DELETE /api/favorites:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, tag, note } = body || {};

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const updatePayload = {};
    if (tag !== undefined) updatePayload.tag = tag || 'General';
    if (note !== undefined) updatePayload.note = note;

    const { data, error } = await supabase
      .from('favorite_messages')
      .update(updatePayload)
      .eq('user_id', user.id)
      .eq('message_id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating favorite message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, favorite: data });
  } catch (err) {
    console.error('Error in PATCH /api/favorites:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

