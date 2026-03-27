import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic();

async function main() {
  console.log("Extracting distances from pending screenshots...\n");

  // Get all pending entries with their race info
  const { data: entries, error } = await supabase
    .from("progress_entries")
    .select("*, races(goal_unit), members(display_name, whatsapp_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch entries:", error.message);
    return;
  }

  if (!entries || entries.length === 0) {
    console.log("No pending entries to process.");
    return;
  }

  console.log(`Found ${entries.length} pending entry/entries.\n`);

  let extracted = 0;
  let failed = 0;

  for (const entry of entries) {
    const member = entry.members as { display_name: string | null; whatsapp_name: string };
    const memberName = member?.display_name || member?.whatsapp_name || "Unknown";
    const goalUnit = (entry.races as { goal_unit: string })?.goal_unit || "km";

    console.log(`Processing entry ${entry.id} (${memberName})...`);

    try {
      // Download screenshot from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from("screenshots")
        .download(entry.screenshot_url);

      if (dlError || !fileData) {
        throw new Error(`Download failed: ${dlError?.message}`);
      }

      // Convert to base64
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mediaType = fileData.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

      // Call Claude vision
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `Extract the total distance from this fitness app screenshot.
I need the number in ${goalUnit}.
Return ONLY a JSON object with no markdown formatting: { "value": <number>, "confidence": "high"|"medium"|"low", "source_app": "<detected app name>", "raw_text": "<the relevant text you read>" }
If you cannot determine the distance value, return: { "value": null, "confidence": "none", "reason": "<why>" }`,
              },
            ],
          },
        ],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      const result = JSON.parse(cleaned);

      const isSuccess = result.confidence === "high" || result.confidence === "medium";

      // Update entry
      await supabase
        .from("progress_entries")
        .update({
          extracted_value: result.value,
          extraction_raw: result,
          status: isSuccess ? "extracted" : "failed",
        })
        .eq("id", entry.id);

      if (isSuccess) {
        console.log(`  Extracted: ${result.value} ${goalUnit} (${result.source_app}, confidence: ${result.confidence})`);
        extracted++;
      } else {
        console.log(`  Failed: ${result.reason || "low confidence"}`);
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  Error: ${msg}`);

      await supabase
        .from("progress_entries")
        .update({
          status: "failed",
          extraction_raw: { error: msg },
        })
        .eq("id", entry.id);

      failed++;
    }
  }

  console.log(`\nDone! Extracted: ${extracted}, Failed: ${failed}`);
}

main().catch(console.error);
