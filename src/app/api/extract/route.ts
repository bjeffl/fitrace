import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDistanceFromScreenshot } from "@/lib/extract";

export async function POST(req: NextRequest) {
  const { entryId } = await req.json();
  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the entry and its race
  const { data: entry, error: entryErr } = await supabase
    .from("progress_entries")
    .select("*, races(*)")
    .eq("id", entryId)
    .single();

  if (entryErr || !entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // Download the screenshot from storage
  const { data: fileData, error: fileErr } = await supabase.storage
    .from("screenshots")
    .download(entry.screenshot_url);

  if (fileErr || !fileData) {
    await supabase
      .from("progress_entries")
      .update({ status: "failed", extraction_raw: { error: "Download failed" } })
      .eq("id", entryId);
    return NextResponse.json({ error: "Failed to download screenshot" }, { status: 500 });
  }

  // Convert to base64
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const base64 = buffer.toString("base64");
  const contentType = fileData.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  // Extract distance using Claude vision
  const result = await extractDistanceFromScreenshot(
    base64,
    contentType,
    entry.races?.goal_unit || "km"
  );

  // Update the entry
  const isSuccess = result.confidence === "high" || result.confidence === "medium";
  await supabase
    .from("progress_entries")
    .update({
      extracted_value: result.value,
      extraction_raw: result as unknown as Record<string, unknown>,
      status: isSuccess ? "extracted" : "failed",
    })
    .eq("id", entryId);

  return NextResponse.json({ result, status: isSuccess ? "extracted" : "failed" });
}
