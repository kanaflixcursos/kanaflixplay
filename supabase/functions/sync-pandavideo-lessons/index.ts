import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PANDAVIDEO_API_URL = "https://api-v2.pandavideo.com.br";

async function getSubfolderIds(folderId: string, apiKey: string): Promise<string[]> {
  const ids: string[] = [folderId];
  try {
    const res = await fetch(`${PANDAVIDEO_API_URL}/folders?parent_folder_id=${folderId}`, {
      headers: { Authorization: apiKey, Accept: "application/json" },
    });
    if (!res.ok) return ids;
    const data = await res.json();
    const folders = Array.isArray(data) ? data : (data.folders || data.data || []);
    for (const f of folders) {
      const childIds = await getSubfolderIds(f.id, apiKey);
      ids.push(...childIds);
    }
  } catch (e) {
    console.error("Error fetching subfolders:", e);
  }
  return ids;
}

interface PandaVideo {
  id: string;
  title: string;
  description?: string;
  status: string;
  duration?: number;
  length?: number;
  folder_id?: string;
  player_url?: string;
  video_player?: string;
  video_external_id?: string;
  library_id?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  cover?: string;
  created_at?: string;
}

async function fetchVideoDetails(videoId: string, apiKey: string): Promise<PandaVideo | null> {
  try {
    const response = await fetch(`${PANDAVIDEO_API_URL}/videos/${videoId}`, {
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch video details for ${videoId}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching video details for ${videoId}:`, error);
    return null;
  }
}

interface Course {
  id: string;
  pandavideo_folder_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Try env var first, fallback to site_settings
    let pandaApiKey = Deno.env.get("PANDAVIDEO_API_KEY");
    if (!pandaApiKey) {
      try {
        const sbKeys = createClient(supabaseUrl, supabaseServiceKey);
        const { data: keyData } = await sbKeys.from("site_settings").select("value").eq("key", "api_keys").maybeSingle();
        if (keyData?.value && typeof keyData.value === "object") {
          pandaApiKey = (keyData.value as Record<string, string>).pandavideo_api_key || "";
        }
      } catch (e) { console.error("Failed to fetch Pandavideo key from DB:", e); }
    }
    if (!pandaApiKey) {
      console.error("PANDAVIDEO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Pandavideo API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    
    // Parse body for POST requests
    let bodyData: { courseId?: string } = {};
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
      } catch {
        // No body or invalid JSON
      }
    }

    // Get courseId from query params or body
    const courseId = url.searchParams.get("course_id") || bodyData.courseId;

    // Check if this is a service role request (from cron job with service role key)
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      
      // Check if it's the service role key (for cron jobs)
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (token === serviceRoleKey) {
        isAuthorized = true;
      } else {
        // Otherwise, validate as a regular user JWT and check admin role
        const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } }
        });
        
        const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
        
        if (!claimsError && claimsData?.claims) {
          const userId = claimsData.claims.sub as string;
          const { data: roleData } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .single();
          
          isAuthorized = roleData?.role === "admin";
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch courses with pandavideo folders
    let coursesQuery = supabase
      .from("courses")
      .select("id, pandavideo_folder_id")
      .not("pandavideo_folder_id", "is", null);

    if (courseId) {
      coursesQuery = coursesQuery.eq("id", courseId);
    }

    const { data: courses, error: coursesError } = await coursesQuery;

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch courses" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${courses?.length || 0} courses to sync`);

    if (!courses || courses.length === 0) {
      return new Response(
        JSON.stringify({ message: "No courses with Pandavideo folders to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      synced: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [] as string[],
    };

    for (const course of courses as Course[]) {
      try {
        console.log(`Syncing course ${course.id} with folder ${course.pandavideo_folder_id}`);
        
        // Fetch all subfolder IDs recursively
        const allFolderIds = await getSubfolderIds(course.pandavideo_folder_id, pandaApiKey);
        console.log(`Found ${allFolderIds.length} folders (including subfolders) for course ${course.id}`);
        
        // Fetch videos from all folders
        let videos: PandaVideo[] = [];
        for (const fId of allFolderIds) {
          const pandaUrl = `${PANDAVIDEO_API_URL}/videos?folder_id=${fId}&limit=100`;
          const response = await fetch(pandaUrl, {
            headers: {
              Authorization: pandaApiKey,
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Pandavideo API error for folder ${fId}:`, response.status, errorText);
            continue;
          }

          const data = await response.json();
          let folderVideos: PandaVideo[] = [];
          if (Array.isArray(data)) {
            folderVideos = data;
          } else if (data.videos && Array.isArray(data.videos)) {
            folderVideos = data.videos;
          } else if (data.data && Array.isArray(data.data)) {
            folderVideos = data.data;
          }
          videos.push(...folderVideos);
        }
        
        console.log(`Found ${videos.length} total videos across all folders`);
        
        if (videos.length > 0) {
          console.log(`First video ID: ${videos[0].id}, status: ${videos[0].status}`);
        }

        // Get existing lessons for this course
        const { data: existingLessons } = await supabase
          .from("lessons")
          .select("id, pandavideo_video_id, order_index")
          .eq("course_id", course.id)
          .not("pandavideo_video_id", "is", null);

        // Ensure a default module exists for the course
        let { data: existingModules } = await supabase
          .from("course_modules")
          .select("id")
          .eq("course_id", course.id)
          .order("order_index")
          .limit(1);

        let defaultModuleId: string | null = null;
        if (existingModules && existingModules.length > 0) {
          defaultModuleId = existingModules[0].id;
        } else {
          const { data: newMod } = await supabase
            .from("course_modules")
            .insert({ course_id: course.id, title: "Módulo Único", order_index: 1 })
            .select("id")
            .single();
          if (newMod) defaultModuleId = newMod.id;
        }

        const existingVideoIds = new Set(
          (existingLessons || []).map((l) => l.pandavideo_video_id)
        );
        const pandaVideoIds = new Set(videos.map((v) => v.id));

        // Create a map to preserve existing order_index
        const existingOrderMap = new Map(
          (existingLessons || []).map((l) => [l.pandavideo_video_id, l.order_index])
        );

        console.log(`Existing lessons with pandavideo_video_id: ${existingVideoIds.size}`);

        // Process each video - accept more status values
        const validStatuses = ["converted", "ready", "published", "active", "online"];
        let newOrderIndex = existingLessons?.length || 0;
        
        for (const video of videos) {
          const status = (video.status || "").toLowerCase();
          
          // Be more permissive with status - if no status or unknown, still try to sync
          const isValidStatus = !video.status || validStatuses.some(s => status.includes(s));
          
          if (!isValidStatus) {
            console.log(`Skipping video ${video.id} with status: ${video.status}`);
            continue;
          }

          // Fetch individual video details to get the correct player_url
          const videoDetails = await fetchVideoDetails(video.id, pandaApiKey);
          
          // Build embed URL - prioritize video_player from details, then player_url
          let embedUrl = videoDetails?.video_player || videoDetails?.player_url || video.player_url;
          
          if (!embedUrl && videoDetails?.video_external_id && videoDetails?.library_id) {
            // Build URL from library_id and video_external_id
            embedUrl = `https://player-vz-${videoDetails.library_id}.tv.pandavideo.com.br/embed/?v=${videoDetails.video_external_id}`;
          }
          
          if (!embedUrl) {
            // Last resort fallback
            embedUrl = `https://player-vz-910d72b1-f0c.tv.pandavideo.com.br/embed/?v=${video.id}`;
          }
          
          // URL built successfully
          
          // Duration comes from 'length' field in Pandavideo API (in seconds)
          const durationSeconds = videoDetails?.length || video.length || videoDetails?.duration || video.duration || 0;
          const durationMinutes = durationSeconds ? Math.ceil(durationSeconds / 60) : null;
          
          // Get thumbnail URL - try different possible fields from Pandavideo API
          const thumbnailUrl = videoDetails?.thumbnail || video.thumbnail || video.thumbnail_url || video.cover || null;

          if (existingVideoIds.has(video.id)) {
            // Update existing lesson - preserve order_index and title, only update video_url, duration, and thumbnail
            const { error: updateError } = await supabase
              .from("lessons")
              .update({
                video_url: embedUrl,
                duration_minutes: durationMinutes,
                thumbnail_url: thumbnailUrl,
              })
              .eq("pandavideo_video_id", video.id)
              .eq("course_id", course.id);

            if (updateError) {
              console.error(`Error updating lesson for video ${video.id}:`, updateError);
              results.errors.push(`Video ${video.id}: Update failed`);
            } else {
              results.updated++;
            }
          } else {
            // Create new lesson with next order_index
            newOrderIndex++;
            const lessonData: Record<string, unknown> = {
              course_id: course.id,
              title: video.title || `Vídeo ${newOrderIndex}`,
              description: video.description || "",
              video_url: embedUrl,
              pandavideo_video_id: video.id,
              order_index: newOrderIndex,
              duration_minutes: durationMinutes,
              thumbnail_url: thumbnailUrl,
            };
            if (defaultModuleId) lessonData.module_id = defaultModuleId;
            
            console.log(`Creating lesson for video: ${video.id} - ${video.title}`);
            const { error: insertError } = await supabase
              .from("lessons")
              .insert(lessonData);

            if (insertError) {
              console.error(`Error creating lesson for video ${video.id}:`, insertError);
              results.errors.push(`Video ${video.id}: Insert failed - ${insertError.message}`);
            } else {
              results.created++;
            }
          }
        }

        // Delete lessons for videos that no longer exist in Pandavideo
        const lessonsToDelete = (existingLessons || []).filter(
          (l) => l.pandavideo_video_id && !pandaVideoIds.has(l.pandavideo_video_id)
        );

        if (lessonsToDelete.length > 0) {
          console.log(`Deleting ${lessonsToDelete.length} orphaned lessons`);
          const { error: deleteError } = await supabase
            .from("lessons")
            .delete()
            .in("id", lessonsToDelete.map((l) => l.id));

          if (deleteError) {
            console.error(`Error deleting lessons for course ${course.id}:`, deleteError);
            results.errors.push(`Course ${course.id}: Delete failed`);
          } else {
            results.deleted += lessonsToDelete.length;
          }
        }

        // Update course last_synced_at
        await supabase
          .from("courses")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", course.id);

        results.synced++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error syncing course ${course.id}:`, error);
        results.errors.push(`Course ${course.id}: ${errorMessage}`);
      }
    }

    console.log("Sync completed:", results);

    return new Response(
      JSON.stringify({
        message: "Sync completed",
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
