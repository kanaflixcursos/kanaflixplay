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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Check if user is admin or creator
    const sbAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await sbAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (roleData || []).map((r: { role: string }) => r.role);
    const isAdmin = roles.includes("admin");
    const isCreator = roles.includes("creator");

    if (!isAdmin && !isCreator) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const creatorIdParam = url.searchParams.get("creator_id");

    // Resolve Pandavideo API key: creator_settings → env var → site_settings
    let pandaApiKey: string | undefined;

    // 1) Try creator-specific key
    let resolvedCreatorId = creatorIdParam;
    if (!resolvedCreatorId && isCreator) {
      const { data: creatorRow } = await sbAdmin.from("creators").select("id").eq("user_id", userId).single();
      resolvedCreatorId = creatorRow?.id;
    }
    if (resolvedCreatorId) {
      const { data: cs } = await sbAdmin.from("creator_settings").select("pandavideo_api_key").eq("creator_id", resolvedCreatorId).single();
      if (cs?.pandavideo_api_key) pandaApiKey = cs.pandavideo_api_key;
    }

    // 2) Fallback to env var
    if (!pandaApiKey) pandaApiKey = Deno.env.get("PANDAVIDEO_API_KEY");

    // 3) Fallback to site_settings
    if (!pandaApiKey) {
      try {
        const { data: keyData } = await sbAdmin.from("site_settings").select("value").eq("key", "api_keys").maybeSingle();
        if (keyData?.value && typeof keyData.value === "object") {
          pandaApiKey = (keyData.value as Record<string, string>).pandavideo_api_key || "";
        }
      } catch (e) { console.error("Failed to fetch Pandavideo key from DB:", e); }
    }

    if (!pandaApiKey) {
      return new Response(
        JSON.stringify({ error: "Pandavideo API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "list": {
        // Only admins can list all videos
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const page = url.searchParams.get("page") || "1";
        const limit = url.searchParams.get("limit") || "50";
        const search = url.searchParams.get("search") || "";
        const folderId = url.searchParams.get("folder_id") || "";

        let apiUrl = `${PANDAVIDEO_API_URL}/videos?page=${page}&limit=${limit}`;
        if (search) {
          apiUrl += `&title=${encodeURIComponent(search)}`;
        }

        // If folder_id is provided, fetch videos from it and all subfolders
        if (folderId) {
          const allFolderIds = await getSubfolderIds(folderId, pandaApiKey);
          console.log(`Fetching videos from ${allFolderIds.length} folders (including subfolders)`);
          
          const allVideos: any[] = [];
          for (const fId of allFolderIds) {
            let folderUrl = `${PANDAVIDEO_API_URL}/videos?folder_id=${encodeURIComponent(fId)}&limit=100`;
            if (search) {
              folderUrl += `&title=${encodeURIComponent(search)}`;
            }
            const res = await fetch(folderUrl, {
              headers: { Authorization: pandaApiKey, Accept: "application/json" },
            });
            if (res.ok) {
              const d = await res.json();
              const vids = Array.isArray(d) ? d : (d.videos || d.data || []);
              allVideos.push(...vids);
            }
          }

          if (allVideos.length > 0) {
            console.log("First video structure:", JSON.stringify(allVideos[0], null, 2));
          }

          return new Response(
            JSON.stringify({ videos: allVideos }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(apiUrl, {
          headers: {
            Authorization: pandaApiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Pandavideo API error:", errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch videos from Pandavideo" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
          console.log("First video structure:", JSON.stringify(data.videos[0], null, 2));
        }
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get": {
        const videoId = url.searchParams.get("videoId");
        if (!videoId) {
          return new Response(
            JSON.stringify({ error: "Video ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(`${PANDAVIDEO_API_URL}/videos/${videoId}`, {
          headers: {
            Authorization: pandaApiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Pandavideo API error:", errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch video from Pandavideo" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "folders": {
        // Only admins can list folders
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(`${PANDAVIDEO_API_URL}/folders`, {
          headers: {
            Authorization: pandaApiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Pandavideo API error:", errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch folders from Pandavideo" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
