import { resolveZipStructure, findMediaInZip } from "./zipResolver";
import { parsePosts } from "./postParser";
import { parseStories } from "./storyParser";
import { parseMessages } from "./messageParser";
import { parseConnections } from "./connectionParser";
import { parseActivityLogs } from "./activityParser";
import {
  parsePersonalInformation,
  parseAdsInformation,
} from "./preferencesParser";
import { uploadMediaToCloudinary } from "./uploader";
import { createClient } from "../supabase/client";

export async function processAndMergeZip(
  file,
  userId,
  onStatusUpdate,
  options = {},
) {
  const { maxThreads = null } = options;
  const supabase = createClient();
  const updateStatus = (phase, details) => {
    if (onStatusUpdate) onStatusUpdate({ phase, ...details });
  };

  try {
    console.log("=== STARTING INSTAGRAM ZIP INGESTION ===");
    console.log("User ID:", userId);
    console.log("File Name:", file.name, "Size:", file.size, "bytes");

    // Phase 0: Ensure User Profile exists in database
    const { data: authUserData } = await supabase.auth.getUser();
    const userEmail = authUserData?.user?.email || "user";
    const fallbackUsername = (
      userEmail.split("@")[0] || `user_${userId.substring(0, 6)}`
    ).toLowerCase();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingProfile) {
      console.log("Creating profile row in Supabase for user:", userId);
      await supabase.from("profiles").upsert(
        {
          id: userId,
          username: fallbackUsername,
          full_name: fallbackUsername,
          bio: "Personal Instagram Export Vault",
        },
        { onConflict: "id" },
      );
    }

    // Phase 1: ZIP Indexing
    updateStatus("indexing", { message: "Reading export ZIP archive..." });
    const zipContext = await resolveZipStructure(file);

    updateStatus("indexing_complete", {
      format: zipContext.format,
      totalFiles: zipContext.totalFiles,
      postsCount: zipContext.postFiles?.length || 0,
      messagesCount: zipContext.messageFiles?.length || 0,
      storiesCount: zipContext.storyFiles?.length || 0,
    });

    // Phase 2: Parse Posts & Upload Media
    let postsProcessed = 0;
    if (zipContext.postFiles && zipContext.postFiles.length > 0) {
      updateStatus("posts_parsing", { message: "Extracting post metadata..." });
      const rawPosts = await parsePosts(zipContext, (p) =>
        updateStatus("posts_parsing_progress", p),
      );

      console.log(`Extracted ${rawPosts.length} posts from JSON/HTML files.`);

      for (let i = 0; i < rawPosts.length; i++) {
        const post = rawPosts[i];
        updateStatus("posts_uploading", {
          current: i + 1,
          total: rawPosts.length,
          message: `Syncing post ${i + 1}/${rawPosts.length}...`,
        });

        const firstMediaUri = post.mediaItems[0]?.uri || "";
        const idMatch = firstMediaUri.match(/17\d{14,15}/);
        const mediaKey = idMatch ? idMatch[0] : firstMediaUri.split('/').pop().toLowerCase();

        let dbPost = null;

        // Check if a post with matching primary media already exists in Supabase
        if (mediaKey) {
          const { data: existingPM } = await supabase
            .from("post_media")
            .select("post_id, posts!inner(id, user_id)")
            .eq("posts.user_id", userId)
            .ilike("media_url", `%${mediaKey}%`)
            .maybeSingle();

          if (existingPM?.post_id) {
            dbPost = { id: existingPM.post_id };
            // Update caption/location if empty
            if (post.caption) {
              await supabase
                .from("posts")
                .update({ caption: post.caption })
                .eq("id", dbPost.id);
            }
          }
        }

        if (!dbPost) {
          const { data: upsertData, error: postErr } = await supabase
            .from("posts")
            .upsert(
              {
                user_id: userId,
                caption: post.caption,
                location: post.location,
                taken_at: post.takenAt,
                export_format: post.exportFormat,
              },
              { onConflict: "user_id,taken_at" },
            )
            .select("id");

          dbPost = upsertData?.[0];

          if (postErr || !dbPost) {
            console.error("Supabase Post Upsert Error:", postErr);
            continue;
          }
        }

        // Upload media items to Cloudinary
        for (let mIdx = 0; mIdx < post.mediaItems.length; mIdx++) {
          const media = post.mediaItems[mIdx];
          let mediaUrl =
            "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800";
          let publicId = `local_${Date.now()}_${mIdx}`;

          if (media.zipEntry) {
            const { data: existingPM } = await supabase
              .from("post_media")
              .select("media_url, cloudinary_public_id")
              .eq("post_id", dbPost.id)
              .eq("order_index", mIdx)
              .maybeSingle();

            if (
              existingPM?.media_url &&
              existingPM.media_url.includes("cloudinary.com")
            ) {
              mediaUrl = existingPM.media_url;
              publicId = existingPM.cloudinary_public_id;
            } else {
              console.log("Uploading post media to Cloudinary:", media.uri);
              const uploaded = await uploadMediaToCloudinary(
                media.zipEntry,
                media.uri,
                "insta_parser/posts",
              );
              if (uploaded) {
                mediaUrl = uploaded.mediaUrl;
                publicId = uploaded.publicId;
              }
            }
          }

          await supabase.from("post_media").upsert(
            {
              post_id: dbPost.id,
              cloudinary_public_id: publicId,
              media_url: mediaUrl,
              media_type: media.mediaType,
              order_index: mIdx,
            },
            { onConflict: "post_id,order_index" },
          );
        }
        postsProcessed++;
      }
    }

    // Phase 3: Parse Stories
    let storiesProcessed = 0;
    if (zipContext.storyFiles && zipContext.storyFiles.length > 0) {
      updateStatus("stories_parsing", {
        message: "Extracting stories archive...",
      });
      const rawStories = await parseStories(zipContext, (s) =>
        updateStatus("stories_parsing_progress", s),
      );

      for (let i = 0; i < rawStories.length; i++) {
        const story = rawStories[i];
        let mediaUrl =
          "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800";

        if (story.zipEntry) {
          const { data: existingStory } = await supabase
            .from("stories")
            .select("media_url")
            .eq("user_id", userId)
            .eq("taken_at", story.takenAt)
            .maybeSingle();

          if (
            existingStory?.media_url &&
            existingStory.media_url.includes("cloudinary.com")
          ) {
            mediaUrl = existingStory.media_url;
          } else {
            console.log("Uploading story media to Cloudinary:", story.mediaUri);
            const uploaded = await uploadMediaToCloudinary(
              story.zipEntry,
              story.mediaUri,
              "insta_parser/stories",
            );
            if (uploaded) mediaUrl = uploaded.mediaUrl;
          }
        }

        const { error: storyErr } = await supabase.from("stories").upsert(
          {
            user_id: userId,
            media_url: mediaUrl,
            media_type: story.mediaType,
            taken_at: story.takenAt,
          },
          { onConflict: "user_id,taken_at" },
        );

        if (!storyErr) storiesProcessed++;
      }
    }

    // Phase 4: Parse Messages (DMs & Attached Media)
    let messagesProcessed = 0;
    let threadsProcessed = 0;
    if (zipContext.messageFiles && zipContext.messageFiles.length > 0) {
      updateStatus("messages_parsing", {
        message: "Extracting conversation threads & media...",
      });
      const allThreads = await parseMessages(
        zipContext,
        (m) => updateStatus("messages_parsing_progress", m),
        options,
      );

      const threads =
        maxThreads && maxThreads > 0
          ? allThreads.slice(0, maxThreads)
          : allThreads;
      console.log(
        `Processing ${threads.length} of ${allThreads.length} chat threads.`,
      );

      for (let tIdx = 0; tIdx < threads.length; tIdx++) {
        const thread = threads[tIdx];
        updateStatus("messages_syncing", {
          current: tIdx + 1,
          total: threads.length,
          message: `Syncing chat & attachments for ${thread.participantName} (${tIdx + 1}/${threads.length})...`,
        });

        const lastMsgAt =
          thread.messages.length > 0
            ? thread.messages[thread.messages.length - 1].sentAt
            : new Date().toISOString();

        const { data: dbConv, error: convErr } = await supabase
          .from("conversations")
          .upsert(
            {
              user_id: userId,
              participant_name: thread.participantName,
              owner_username: thread.ownerUsername || null,
              thread_folder_id: thread.threadFolderId,
              is_group: thread.isGroup,
              last_message_at: lastMsgAt,
            },
            { onConflict: "user_id,participant_name" },
          )
          .select("id")
          .single();

        if (convErr || !dbConv) {
          console.error("Supabase Conversation Upsert Error:", convErr);
          continue;
        }

        threadsProcessed++;

        // Create a clean chat-specific folder name for Cloudinary (e.g. insta_parser/chats/arwapeeth)
        const sanitizedChatName = (
          thread.participantName ||
          thread.threadFolderId ||
          "chat"
        )
          .replace(/[^a-zA-Z0-9_\-]/g, "_")
          .substring(0, 50);
        const chatFolder = `insta_parser/chats/${sanitizedChatName}`;

        // Batch query existing media_urls for this conversation
        const { data: existingMsgs } = await supabase
          .from("messages")
          .select("sender_name, sent_at, media_url")
          .eq("conversation_id", dbConv.id)
          .not("media_url", "is", null);

        // Build dual maps: by filename AND by (sender + minute timestamp)
        const existingMediaByFilename = new Map();
        const existingMediaBySenderTime = new Map();

        if (existingMsgs) {
          existingMsgs.forEach((m) => {
            if (m.media_url && m.media_url.includes("cloudinary.com")) {
              // 1. Map by sender + minute ISO key (e.g. "Mary_2024-06-27T21:27")
              if (m.sender_name && m.sent_at) {
                const minuteKey = new Date(m.sent_at)
                  .toISOString()
                  .slice(0, 16);
                existingMediaBySenderTime.set(
                  `${m.sender_name}_${minuteKey}`,
                  m.media_url,
                );
              }

              // 2. Map by filename snippet
              const urlParts = m.media_url.split("/");
              const fileWithExt = urlParts[urlParts.length - 1].split("?")[0];
              if (fileWithExt) {
                existingMediaByFilename.set(
                  fileWithExt.toLowerCase(),
                  m.media_url,
                );
                const baseName = fileWithExt.split(".")[0].toLowerCase();
                if (baseName)
                  existingMediaByFilename.set(baseName, m.media_url);
              }
            }
          });
        }

        // Build array of messages to insert
        const messagesToInsert = [];
        for (const msg of thread.messages) {
          let mediaUrl = null;

          if (msg.mediaZipEntry) {
            const rawFilename = (msg.mediaUri || "")
              .split("/")
              .pop()
              .toLowerCase();
            const rawBaseName = rawFilename.split(".")[0];
            const minuteKey = msg.sentAt
              ? new Date(msg.sentAt).toISOString().slice(0, 16)
              : "";
            const senderTimeKey = `${msg.senderName}_${minuteKey}`;

            const existingUrl =
              existingMediaByFilename.get(rawFilename) ||
              existingMediaByFilename.get(rawBaseName) ||
              existingMediaBySenderTime.get(senderTimeKey);

            if (existingUrl) {
              // Existing Cloudinary asset — skip re-upload completely!
              mediaUrl = existingUrl;
            } else {
              console.log(
                `Uploading chat attachment to Cloudinary (${chatFolder}):`,
                msg.mediaUri,
              );
              const uploaded = await uploadMediaToCloudinary(
                msg.mediaZipEntry,
                msg.mediaUri,
                chatFolder,
              );
              if (uploaded) {
                mediaUrl = uploaded.mediaUrl;
                existingMediaByFilename.set(rawFilename, mediaUrl);
                if (minuteKey)
                  existingMediaBySenderTime.set(senderTimeKey, mediaUrl);
              }
            }
          }

          messagesToInsert.push({
            conversation_id: dbConv.id,
            sender_name: msg.senderName,
            content: msg.content || null,
            media_url: mediaUrl,
            media_type: msg.mediaType || null,
            message_type: msg.messageType || "text",
            reactions: msg.reactions?.length > 0 ? msg.reactions : [],
            share_url: msg.shareUrl || null,
            share_text: msg.shareText || null,
            sent_at: msg.sentAt,
          });
        }

        // Delete existing messages for this conversation so re-importing cleanly replaces the thread
        await supabase
          .from("messages")
          .delete()
          .eq("conversation_id", dbConv.id);

        // Bulk insert all messages in chunks of 200 (super fast & preserves 100% of identical timestamp messages)
        const CHUNK_SIZE = 200;
        for (let i = 0; i < messagesToInsert.length; i += CHUNK_SIZE) {
          const chunk = messagesToInsert.slice(i, i + CHUNK_SIZE);
          const { error: batchErr } = await supabase
            .from("messages")
            .insert(chunk);
          if (batchErr) {
            console.error("Batch message insert error:", batchErr);
          } else {
            messagesProcessed += chunk.length;
          }
        }
      }
    }

    // Phase 5: Connections
    let connectionsProcessed = 0;
    if (
      (zipContext.connectionFiles && zipContext.connectionFiles.length > 0) ||
      (zipContext.followerFiles && zipContext.followerFiles.length > 0) ||
      (zipContext.followingFiles && zipContext.followingFiles.length > 0)
    ) {
      updateStatus("connections_parsing", {
        message: "Extracting followers & following...",
      });
      const connections = await parseConnections(zipContext);

      if (connections.length > 0) {
        // Clean previous connection rows for this user before fresh import
        await supabase.from("connections").delete().eq("user_id", userId);

        for (const conn of connections) {
          const { error: connErr } = await supabase.from("connections").insert({
            user_id: userId,
            connection_type: conn.type,
            target_username: conn.targetUsername,
            connected_at: conn.connectedAt,
          });
          if (!connErr) connectionsProcessed++;
        }
      }
    }

    // Phase 6: Activity Logs (Search & Link History)
    let activityLogsProcessed = 0;
    if (zipContext.loggedInfoFiles && zipContext.loggedInfoFiles.length > 0) {
      updateStatus("activity_parsing", {
        message: "Extracting search and link history...",
      });
      const activityLogs = await parseActivityLogs(zipContext);

      if (activityLogs.length > 0) {
        // 1. Try table insert
        const { error: deleteErr } = await supabase
          .from("activity_logs")
          .delete()
          .eq("user_id", userId);
        if (!deleteErr) {
          for (const log of activityLogs) {
            const { error: actErr } = await supabase
              .from("activity_logs")
              .insert({
                user_id: userId,
                type: log.type,
                title: log.title,
                value: log.value,
                created_at: log.createdAt,
              });
            if (!actErr) activityLogsProcessed++;
          }
        }

        // 2. Guaranteed Fallback: Store in profiles.preferences JSONB column
        try {
          const { data: existingProf } = await supabase
            .from("profiles")
            .select("preferences")
            .eq("id", userId)
            .maybeSingle();
          const currentPrefs = existingProf?.preferences || {};
          await supabase
            .from("profiles")
            .update({
              preferences: {
                ...currentPrefs,
                activity_logs: activityLogs,
              },
            })
            .eq("id", userId);
          activityLogsProcessed = activityLogs.length;
        } catch (e) {
          console.warn(
            "Could not save activity_logs fallback to profiles.preferences:",
            e,
          );
        }
      }
    }

    // Phase 7: Personal Information & Ads Preferences
    try {
      updateStatus("preferences_parsing", {
        message: "Extracting personal information & ad preferences...",
      });
      const personalInfo = await parsePersonalInformation(zipContext);
      const adsInfo = await parseAdsInformation(zipContext);

      const { data: existingProf } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      const currentPrefs = existingProf?.preferences || {};

      const profileUpdates = {
        preferences: {
          ...currentPrefs,
          personal_info: personalInfo || currentPrefs.personal_info || null,
          ads_viewed: adsInfo.adsViewed?.length
            ? adsInfo.adsViewed
            : currentPrefs.ads_viewed || [],
          interested_posts: adsInfo.interestedPosts?.length
            ? adsInfo.interestedPosts
            : currentPrefs.interested_posts || [],
          profiles_not_interested: adsInfo.profilesNotInterested?.length
            ? adsInfo.profilesNotInterested
            : currentPrefs.profiles_not_interested || [],
          ad_preferences: adsInfo.adPreferences?.length
            ? adsInfo.adPreferences
            : currentPrefs.ad_preferences || [],
        },
      };

      if (personalInfo) {
        if (personalInfo.username)
          profileUpdates.username = personalInfo.username;
        if (personalInfo.fullName)
          profileUpdates.full_name = personalInfo.fullName;
        if (personalInfo.email) profileUpdates.email = personalInfo.email;
        if (personalInfo.phone) profileUpdates.phone = personalInfo.phone;
        if (personalInfo.bio) profileUpdates.bio = personalInfo.bio;
        if (personalInfo.gender) profileUpdates.gender = personalInfo.gender;
        if (personalInfo.dob) profileUpdates.dob = personalInfo.dob;
        if (personalInfo.website) profileUpdates.website = personalInfo.website;
        if (typeof personalInfo.isPrivate === "boolean")
          profileUpdates.is_private = personalInfo.isPrivate;
        if (personalInfo.profilePicUri) {
          const cleanPicUri = personalInfo.profilePicUri.replace(/^(\.\/|\/)/, '');
          const picZipEntry = findMediaInZip(cleanPicUri, zipContext.mediaFiles, zipContext.zip);

          if (picZipEntry) {
            console.log('Uploading profile photo to Cloudinary:', cleanPicUri);
            const uploadedAvatar = await uploadMediaToCloudinary(
              picZipEntry,
              cleanPicUri,
              'insta_parser/avatar'
            );
            if (uploadedAvatar?.mediaUrl) {
              profileUpdates.avatar_url = uploadedAvatar.mediaUrl;
            }
          }
        }
      }

      await supabase.from("profiles").update(profileUpdates).eq("id", userId);
    } catch (prefErr) {
      console.error(
        "Error saving personal_info and ads_info to profiles:",
        prefErr,
      );
    }

    console.log("=== INGESTION & MERGE SUMMARY ===");
    console.log(
      `Posts: ${postsProcessed}, Stories: ${storiesProcessed}, Threads: ${threadsProcessed}, Messages: ${messagesProcessed}, Connections: ${connectionsProcessed}`,
    );

    updateStatus("completed", {
      message: "Ingestion and merging completed successfully!",
      stats: {
        posts: postsProcessed,
        stories: storiesProcessed,
        threads: threadsProcessed,
        messages: messagesProcessed,
        connections: connectionsProcessed,
      },
    });

    return {
      success: true,
      stats: {
        posts: postsProcessed,
        stories: storiesProcessed,
        threads: threadsProcessed,
        messages: messagesProcessed,
        connections: connectionsProcessed,
      },
    };
  } catch (err) {
    console.error("Fatal data merger error:", err);
    updateStatus("error", { message: err.message || "Data ingestion failed" });
    throw err;
  }
}
