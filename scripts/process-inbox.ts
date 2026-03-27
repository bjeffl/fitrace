import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INBOX_DIR = path.join(__dirname, "..", "inbox");
const SCREENSHOTS_DIR = path.join(INBOX_DIR, "screenshots");
const PROCESSED_DIR = path.join(INBOX_DIR, "processed");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

interface ProcessResult {
  file: string;
  member: string;
  distance: number | null;
  status: "success" | "failed" | "skipped";
  message: string;
}

async function getOrCreateMember(name: string): Promise<string> {
  // Check if member exists
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .ilike("whatsapp_name", name)
    .limit(1);

  if (existing && existing.length > 0) return existing[0].id;

  // Also check display_name
  const { data: byDisplay } = await supabase
    .from("members")
    .select("id")
    .ilike("display_name", name)
    .limit(1);

  if (byDisplay && byDisplay.length > 0) return byDisplay[0].id;

  // Create new member
  const { data: created, error } = await supabase
    .from("members")
    .insert({ whatsapp_name: name, display_name: name })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create member ${name}: ${error.message}`);
  return created.id;
}

async function getActiveRace(): Promise<{ id: string; goal_unit: string } | null> {
  const { data } = await supabase
    .from("races")
    .select("id, goal_unit")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

async function addToRace(raceId: string, memberId: string) {
  await supabase
    .from("race_members")
    .upsert(
      { race_id: raceId, member_id: memberId },
      { onConflict: "race_id,member_id" }
    );
}

async function uploadAndCreateEntry(
  filePath: string,
  raceId: string,
  memberId: string,
  fileDate: Date
): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  const storagePath = `${raceId}/${memberId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("screenshots")
    .upload(storagePath, buffer, {
      contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    });

  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data: entry, error: entryErr } = await supabase
    .from("progress_entries")
    .insert({
      race_id: raceId,
      member_id: memberId,
      screenshot_url: storagePath,
      source: "manual",
      status: "pending",
      whatsapp_ts: fileDate.toISOString(),
    })
    .select("id")
    .single();

  if (entryErr) throw new Error(`Entry creation failed: ${entryErr.message}`);
  return entry.id;
}

function getMemberNameFromFile(filename: string): string {
  // Remove extension, then take everything before a number, underscore+number, or dash+number
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  // Clean up: "Vivian_1", "Vivian 2", "Vivian" all become "Vivian"
  const cleaned = nameWithoutExt
    .replace(/[_\-\s]*\d+$/, "") // Remove trailing numbers
    .replace(/[_\-]+$/, "") // Remove trailing separators
    .trim();
  return cleaned;
}

async function processScreenshots() {
  console.log("--- Processing screenshots ---\n");

  const race = await getActiveRace();
  if (!race) {
    console.log("No active race found. Create one at /admin first.");
    return;
  }

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  });

  if (files.length === 0) {
    console.log("No screenshots found in inbox/screenshots/\n");
    return;
  }

  // Sort by modification time (most recent last)
  files.sort((a, b) => {
    const aTime = fs.statSync(path.join(SCREENSHOTS_DIR, a)).mtimeMs;
    const bTime = fs.statSync(path.join(SCREENSHOTS_DIR, b)).mtimeMs;
    return aTime - bTime;
  });

  console.log(`Found ${files.length} screenshot(s) to process:\n`);

  const results: ProcessResult[] = [];

  for (const file of files) {
    const filePath = path.join(SCREENSHOTS_DIR, file);
    const memberName = getMemberNameFromFile(file);
    const fileDate = fs.statSync(filePath).mtime;

    console.log(`Processing: ${file}`);
    console.log(`  Member: ${memberName}`);
    console.log(`  Date: ${fileDate.toLocaleDateString()}`);

    try {
      const memberId = await getOrCreateMember(memberName);
      await addToRace(race.id, memberId);

      const entryId = await uploadAndCreateEntry(filePath, race.id, memberId, fileDate);
      console.log(`  Entry created: ${entryId}`);
      console.log(`  Status: pending extraction (run npm run extract next)`);

      // Move to processed
      fs.renameSync(filePath, path.join(PROCESSED_DIR, `${Date.now()}_${file}`));

      results.push({
        file,
        member: memberName,
        distance: null,
        status: "success",
        message: `Uploaded, entry ${entryId} created`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${message}`);
      results.push({
        file,
        member: memberName,
        distance: null,
        status: "failed",
        message,
      });
    }

    console.log();
  }

  const success = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`Screenshots: ${success} uploaded, ${failed} failed.`);

  if (success > 0) {
    console.log("\nNext step: npm run extract");
  }
}

async function main() {
  console.log("Processing inbox...\n");

  // Ensure dirs exist
  for (const dir of [SCREENSHOTS_DIR, PROCESSED_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  await processScreenshots();
}

main().catch(console.error);
