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
      return new Response(
        JSON.stringify({ error: "Pandavideo API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check authorization - either service key (cron) or admin user
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      
      // Check if it's a user token
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: claimsData } = await supabaseClient.auth.getClaims(token);
      
      if (claimsData?.claims?.sub) {
        // Check if user is admin
        const { data: roleData } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", claimsData.claims.sub)
          .single();
        
        isAuthorized = roleData?.role === "admin";
      }
    }

    // For cron jobs, we use service role key directly
    const url = new URL(req.url);
    const isCronJob = url.searchParams.get("cron") === "true";
    
    if (!isAuthorized && !isCronJob) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get course_id from params (optional - if not provided, sync all courses)
    const courseId = url.searchParams.get("course_id");

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
        // Fetch videos from Pandavideo folder
        const response = await fetch(
          `${PANDAVIDEO_API_URL}/videos?folder_id=${course.pandavideo_folder_id}&limit=100`,
          {
            headers: {
              Authorization: pandaApiKey,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching videos for course ${course.id}:`, errorText);
          results.errors.push(`Course ${course.id}: Failed to fetch videos`);
          continue;
        }

        const data = await response.json();
        const videos: PandaVideo[] = data.videos || data || [];

        // Get existing lessons for this course
        const { data: existingLessons } = await supabase
          .from("lessons")
          .select("id, pandavideo_video_id")
          .eq("course_id", course.id)
          .not("pandavideo_video_id", "is", null);

        const existingVideoIds = new Set(
          (existingLessons || []).map((l) => l.pandavideo_video_id)
        );
        const pandaVideoIds = new Set(videos.map((v) => v.id));

        // Process each video
        for (let index = 0; index < videos.length; index++) {
          const video = videos[index];
          
          // Skip non-converted videos
          if (video.status !== "converted" && video.status !== "ready") {
            continue;
          }

          const embedUrl = video.player_url || `https://player-vz-${video.id.slice(0, 8)}.tv.pandavideo.com.br/embed/?v=${video.id}`;
          const durationMinutes = video.duration ? Math.ceil(video.duration / 60) : null;

          const lessonData = {
            course_id: course.id,
            title: video.title,
            description: video.description || "",
            video_url: embedUrl,
            pandavideo_video_id: video.id,
            order_index: index + 1,
            duration_minutes: durationMinutes,
          };

          if (existingVideoIds.has(video.id)) {
            // Update existing lesson
            const { error: updateError } = await supabase
              .from("lessons")
              .update({
                title: lessonData.title,
                description: lessonData.description,
                video_url: lessonData.video_url,
                order_index: lessonData.order_index,
                duration_minutes: lessonData.duration_minutes,
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
            // Create new lesson
            const { error: insertError } = await supabase
              .from("lessons")
              .insert(lessonData);

            if (insertError) {
              console.error(`Error creating lesson for video ${video.id}:`, insertError);
              results.errors.push(`Video ${video.id}: Insert failed`);
            } else {
              results.created++;
            }
          }
        }

        // Delete lessons for videos that no longer exist in Pandavideo
        const lessonsToDelete = (existingLessons || []).filter(
          (l) => !pandaVideoIds.has(l.pandavideo_video_id!)
        );

        if (lessonsToDelete.length > 0) {
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
