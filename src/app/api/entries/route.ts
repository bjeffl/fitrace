import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH - manual override of extracted value
export async function PATCH(req: NextRequest) {
  const { entryId, value } = await req.json();
  if (!entryId || value === undefined) {
    return NextResponse.json({ error: "entryId and value required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("progress_entries")
    .update({
      extracted_value: value,
      status: "manual_override",
    })
    .eq("id", entryId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}
