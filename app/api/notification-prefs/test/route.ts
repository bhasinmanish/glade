import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });

  // Fall back to env override so the Resend account email can be used during testing
  const to = process.env.RESEND_TEST_TO ?? user.email;
  if (!to) return NextResponse.json({ error: "No email on account" }, { status: 400 });

  console.log("[test-email] sending to:", to);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:36px 24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
      <span style="font-size:18px;font-weight:700;color:#818cf8;letter-spacing:-0.02em;">Glade</span>
      <span style="background:#1e293b;color:#64748b;font-size:10px;padding:2px 10px;border-radius:99px;font-weight:500;">Test Email</span>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;">
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:10px;">
        Email Notifications Active
      </div>
      <div style="font-size:18px;font-weight:700;color:#e2e8f0;margin-bottom:6px;">
        Your Glade alerts are working!
      </div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.6;">
        When price alerts or market news match your criteria, you'll receive an email like this one.
      </div>
      <a href="${appUrl}/alerts"
         style="display:inline-block;margin-top:20px;background:#6366f1;color:#ffffff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;text-decoration:none;">
        View Alerts →
      </a>
    </div>
    <div style="text-align:center;margin-top:24px;font-size:11px;color:#475569;">
      ${dateStr} · <a href="${appUrl}/dashboard" style="color:#6366f1;text-decoration:none;">Dashboard</a>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    "Glade Alerts <onboarding@resend.dev>",
      to:      [to],
      subject: "✓ Test Alert — Glade email notifications are active",
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
