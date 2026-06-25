import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Rallies AI posts to this endpoint when a breakout fires.
// Configure Rallies to POST to: https://<your-domain>/api/webhooks/rallies
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Basic shared-secret validation (set RALLIES_WEBHOOK_SECRET in env + Rallies config)
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.RALLIES_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  // Write alert for every user who has Rallies enabled
  // In production, scope this to the user whose account triggered the webhook
  const { error } = await supabase.from("alerts").insert({
    user_id: body.user_id ?? null,
    type: "rallies_breakout",
    symbol: body.symbol ?? null,
    condition: body.condition ?? null,
    triggered_at: new Date().toISOString(),
    delivered_via: ["in_app"],
    is_read: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
