import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  let query = supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (date) query = query.eq("date", date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(date ? (data?.[0] ?? null) : data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("daily_summaries")
    .upsert(
      {
        user_id:      user.id,
        date:         body.date,
        pnl:          body.pnl ?? 0,
        trades_count: body.trades_count ?? 0,
        summary_text: body.summary_text ?? null,
        raw_chat_json: body.raw_chat_json ?? null,
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
