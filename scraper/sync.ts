import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "./config";

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

export async function upsertMember(
  whatsappName: string,
  avatarUrl: string | null
): Promise<string> {
  const { data, error } = await supabase
    .from("members")
    .upsert(
      {
        whatsapp_name: whatsappName,
        display_name: whatsappName,
        avatar_url: avatarUrl,
      },
      { onConflict: "whatsapp_name" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`Failed to upsert member: ${error.message}`);
  return data.id;
}

export async function getActiveRaceId(): Promise<string | null> {
  const { data } = await supabase
    .from("races")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.id || null;
}

export async function addMemberToRace(
  raceId: string,
  memberId: string
): Promise<void> {
  await supabase
    .from("race_members")
    .upsert(
      { race_id: raceId, member_id: memberId },
      { onConflict: "race_id,member_id" }
    );
}

export async function entryExists(
  memberId: string,
  whatsappTs: string
): Promise<boolean> {
  const { data } = await supabase
    .from("progress_entries")
    .select("id")
    .eq("member_id", memberId)
    .eq("whatsapp_ts", whatsappTs)
    .limit(1);

  return (data?.length || 0) > 0;
}

export async function uploadScreenshot(
  buffer: Buffer,
  raceId: string,
  memberId: string
): Promise<string> {
  const path = `${raceId}/${memberId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("screenshots")
    .upload(path, buffer, { contentType: "image/jpeg" });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function createEntry(
  raceId: string,
  memberId: string,
  screenshotUrl: string,
  whatsappTs: string
): Promise<string> {
  const { data, error } = await supabase
    .from("progress_entries")
    .insert({
      race_id: raceId,
      member_id: memberId,
      screenshot_url: screenshotUrl,
      source: "scraper",
      status: "pending",
      whatsapp_ts: whatsappTs,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create entry: ${error.message}`);
  return data.id;
}

export async function triggerExtraction(entryId: string): Promise<void> {
  try {
    await fetch(`${CONFIG.appBaseUrl}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
  } catch (err) {
    console.error(`Extraction trigger failed for ${entryId}:`, err);
  }
}
