import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const memberId = formData.get("memberId") as string | null;
  const raceId = formData.get("raceId") as string | null;

  if (!file || !memberId || !raceId) {
    return NextResponse.json(
      { error: "file, memberId, and raceId are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Upload to storage
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${raceId}/${memberId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from("screenshots")
    .upload(path, buffer, { contentType: file.type });

  if (uploadErr) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Create progress entry
  const { data: entry, error: entryErr } = await supabase
    .from("progress_entries")
    .insert({
      race_id: raceId,
      member_id: memberId,
      screenshot_url: path,
      source: "manual",
      status: "pending",
    })
    .select()
    .single();

  if (entryErr) {
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }

  // Trigger extraction
  const extractUrl = new URL("/api/extract", req.url);
  fetch(extractUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId: entry.id }),
  }).catch(() => {
    // Fire and forget - extraction runs async
  });

  return NextResponse.json({ entry });
}
