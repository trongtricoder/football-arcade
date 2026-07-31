import { getSupabasePublicConfig } from "@/lib/supabase/public-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { url, publishableKey } = getSupabasePublicConfig();
    const response = await fetch(
      `${url}/rest/v1/achievement_definitions?select=id`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          Prefer: "count=exact",
        },
        cache: "no-store",
      },
    );
    const body = await response.text();

    if (!response.ok) {
      return Response.json(
        {
          connected: false,
          status: response.status,
          statusText: response.statusText,
          error: body || "Supabase returned an empty response.",
        },
        { status: 500 },
      );
    }

    const rows = JSON.parse(body) as Array<{ id: string }>;

    return Response.json({
      connected: true,
      achievementDefinitions: rows.length,
    });
  } catch (error) {
    const cause =
      error instanceof Error && error.cause
        ? String(error.cause)
        : undefined;

    return Response.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        cause,
      },
      { status: 500 },
    );
  }
}
