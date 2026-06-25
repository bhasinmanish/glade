import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Trigger an on-demand scan via the Python service
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read dynamic scan params from the request body
  let body: { filters?: unknown; page?: number; page_size?: number } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — Python service uses defaults
  }

  const serviceUrl = process.env.PYTHON_SERVICE_URL;

  let res: Response;
  try {
    res = await fetch(`${serviceUrl}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Secret": process.env.PYTHON_SERVICE_SECRET!,
      },
      body: JSON.stringify({
        user_id: user.id,
        filters: body.filters ?? null,
        page: body.page ?? 0,
        page_size: body.page_size ?? 50,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Python service is not running. Start it with: cd python-service && python main.py" },
      { status: 503 }
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Scanner service error", detail: text },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

// Fetch today's scan results for the current user (used by dashboard)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("rvol", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
