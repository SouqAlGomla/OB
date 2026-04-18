import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Cleanup job: delete ads older than 15 days from creation/approval and remove their images
export const Route = createFileRoute("/hooks/cleanup-ads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) {
          return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL!;
        const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!SERVICE_ROLE) {
          return new Response(JSON.stringify({ error: "Service role not configured" }), {
            status: 500,
          });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const now = new Date().toISOString();
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // 1) Find ads that are about to expire within 24 hours -> warn (just mark, app shows banner)
        await supabase
          .from("ads")
          .update({ expiry_warning_sent: true })
          .lte("expires_at", tomorrow)
          .gt("expires_at", now)
          .eq("expiry_warning_sent", false);

        // 2) Find expired ads -> delete (and their storage images)
        const { data: expiredAds } = await supabase
          .from("ads")
          .select("id, images")
          .lte("expires_at", now);

        let deletedCount = 0;
        let imagesRemoved = 0;

        if (expiredAds && expiredAds.length > 0) {
          // Collect storage paths from public urls (path after /ads/)
          const paths: string[] = [];
          for (const ad of expiredAds) {
            for (const url of ad.images ?? []) {
              const idx = url.indexOf("/ads/");
              if (idx !== -1) {
                paths.push(url.substring(idx + "/ads/".length));
              }
            }
          }

          if (paths.length > 0) {
            const { data: removed } = await supabase.storage.from("ads").remove(paths);
            imagesRemoved = removed?.length ?? 0;
          }

          const ids = expiredAds.map((a) => a.id);
          const { error: delErr, count } = await supabase
            .from("ads")
            .delete({ count: "exact" })
            .in("id", ids);

          if (delErr) {
            return new Response(
              JSON.stringify({ error: "delete failed", message: delErr.message }),
              { status: 500 },
            );
          }
          deletedCount = count ?? ids.length;
        }

        return new Response(
          JSON.stringify({
            success: true,
            deletedAds: deletedCount,
            imagesRemoved,
            timestamp: now,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
