import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const categories = new Set(["bug", "data", "idea", "accessibility", "other"]);

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 12_000) {
      return Response.json({ error: "Feedback is too large." }, { status: 413 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12_000) {
      return Response.json({ error: "Feedback is too large." }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid feedback request." }, { status: 400 });
    }
    if (clean(body.website, 100)) {
      return Response.json({ received: true });
    }

    const category = clean(body.category, 30).toLowerCase();
    const message = clean(body.message, 2_000);
    const contactEmail = clean(body.contactEmail, 254).toLowerCase();
    const pagePath = clean(body.pagePath, 300);

    if (!categories.has(category)) {
      return Response.json({ error: "Choose a valid feedback category." }, { status: 400 });
    }
    if (message.length < 10) {
      return Response.json({ error: "Please add at least 10 characters." }, { status: 400 });
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return Response.json({ error: "Enter a valid email or leave it blank." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const token = bearerToken(request);
    if (!token) {
      return Response.json({ error: "Start a guest session before sending feedback." }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: "Your session expired. Refresh and try again." }, { status: 401 });
    }
    const userId = user.id;

    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count, error: countError } = await supabase
      .from("feedback_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);
    if (countError) throw countError;
    if ((count || 0) >= 5) {
      return Response.json({ error: "Feedback limit reached. Try again later." }, { status: 429 });
    }

    const { data, error } = await supabase
      .from("feedback_submissions")
      .insert({
        user_id: userId,
        category,
        message,
        contact_email: contactEmail || null,
        page_path: pagePath || null,
      })
      .select("id")
      .single();

    if (error) throw error;
    return Response.json({ received: true, reference: String(data.id).slice(0, 8) });
  } catch (error) {
    console.error("Feedback submission failed", error);
    return Response.json(
      { error: "Feedback is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
