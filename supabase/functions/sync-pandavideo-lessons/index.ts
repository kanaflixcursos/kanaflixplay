import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PANDAVIDEO_API_URL = "https://api-v2.pandavideo.com.br";

interface PandaVideo {
  id: string;
  title: string;
  description?: string;
  status: string;
  duration?: number;
  folder_id?: string;
  player_url?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  cover?: string;
  created_at?: string;
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
    const pandaApiKey = Deno.env.get("PANDAVIDEO_API_KEY");

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
    const isCronJob = url.searchParams.get("cron") === "true";

    // Check authorization for non-cron requests
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = isCronJob;
    
    if (!isCronJob && authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (user) {
        const { data: roleData } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        isAuthorized = roleData?.role === "admin";
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
        
        // Fetch videos from Pandavideo folder
        const pandaUrl = `${PANDAVIDEO_API_URL}/videos?folder_id=${course.pandavideo_folder_id}&limit=100`;
        console.log(`Fetching from: ${pandaUrl}`);
        
        const response = await fetch(pandaUrl, {
          headers: {
            Authorization: pandaApiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Pandavideo API error for course ${course.id}:`, response.status, errorText);
          results.errors.push(`Course ${course.id}: Pandavideo API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`Pandavideo response structure:`, JSON.stringify(Object.keys(data)));
        
        // Handle different response formats
        let videos: PandaVideo[] = [];
        if (Array.isArray(data)) {
          videos = data;
        } else if (data.videos && Array.isArray(data.videos)) {
          videos = data.videos;
        } else if (data.data && Array.isArray(data.data)) {
          videos = data.data;
        }
        
        console.log(`Found ${videos.length} videos in folder`);
        
        if (videos.length > 0) {
          console.log(`First video sample:`, JSON.stringify({
            id: videos[0].id,
            title: videos[0].title,
            status: videos[0].status,
            thumbnail: videos[0].thumbnail,
            thumbnail_url: videos[0].thumbnail_url,
            cover: videos[0].cover,
          }));
        }

        // Get existing lessons for this course
        const { data: existingLessons } = await supabase
          .from("lessons")
          .select("id, pandavideo_video_id, order_index")
          .eq("course_id", course.id)
          .not("pandavideo_video_id", "is", null);

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

          // Build embed URL
          const embedUrl = video.player_url || 
            `https://player-vz-${video.id.substring(0, 8)}.tv.pandavideo.com.br/embed/?v=${video.id}`;
          const durationMinutes = video.duration ? Math.ceil(video.duration / 60) : null;
          
          // Get thumbnail URL - try different possible fields from Pandavideo API
          const thumbnailUrl = video.thumbnail || video.thumbnail_url || video.cover || null;

          if (existingVideoIds.has(video.id)) {
            // Update existing lesson - preserve order_index, update video_url, duration, and thumbnail
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
            const lessonData = {
              course_id: course.id,
              title: video.title || `Vídeo ${newOrderIndex}`,
              description: video.description || "",
              video_url: embedUrl,
              pandavideo_video_id: video.id,
              order_index: newOrderIndex,
              duration_minutes: durationMinutes,
              thumbnail_url: thumbnailUrl,
            };
            
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
