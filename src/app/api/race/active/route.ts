import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  // Get the most recently created race
  const { data: race, error } = await supabase
    .from("races")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !race) {
    return NextResponse.json({ error: "No active race" }, { status: 404 });
  }

  return NextResponse.json({ race });
}
