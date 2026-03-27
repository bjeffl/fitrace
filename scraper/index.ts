import {
  launchBrowser,
  navigateToGroup,
  scrapeGroupMembers,
  scrapeMessages,
  downloadImage,
} from "./whatsapp";
import {
  upsertMember,
  getActiveRaceId,
  addMemberToRace,
  entryExists,
  uploadScreenshot,
  createEntry,
  triggerExtraction,
} from "./sync";

async function main() {
  console.log("Starting FitRace WhatsApp scraper...\n");

  const { browser, page } = await launchBrowser();

  try {
    await navigateToGroup(page);

    // Step 1: Scrape group members
    console.log("\n--- Scraping group members ---");
    const memberNames = await scrapeGroupMembers(page);
    const memberIds = new Map<string, string>();

    for (const name of memberNames) {
      const id = await upsertMember(name, null);
      memberIds.set(name, id);
      console.log(`  Member: ${name} -> ${id}`);
    }

    // Step 2: Check for active race
    const raceId = await getActiveRaceId();
    if (!raceId) {
      console.log(
        "\nNo active race found. Create one at /admin first, then run again."
      );
      return;
    }

    // Add all members to the race
    for (const [, memberId] of memberIds) {
      await addMemberToRace(raceId, memberId);
    }
    console.log(`\nAll members added to race ${raceId}`);

    // Step 3: Scrape messages with images
    console.log("\n--- Scraping messages ---");
    await navigateToGroup(page); // Re-navigate to make sure we're in the chat
    const messages = await scrapeMessages(page, 15);

    const imageMessages = messages.filter((m) => m.hasImage);
    console.log(`\nFound ${imageMessages.length} image messages to process`);

    let processed = 0;
    let skipped = 0;

    for (const msg of imageMessages) {
      const memberId = memberIds.get(msg.sender);
      if (!memberId) {
        console.log(`  Skipping unknown sender: ${msg.sender}`);
        skipped++;
        continue;
      }

      // Create a timestamp for dedup (combine date and time from WhatsApp)
      const whatsappTs = new Date().toISOString().split("T")[0] + "T" + msg.timestamp + ":00Z";

      // Check if already processed
      const exists = await entryExists(memberId, whatsappTs);
      if (exists) {
        skipped++;
        continue;
      }

      // Download the image
      if (!msg.imageDataUrl) {
        console.log(`  No image data for message from ${msg.sender}`);
        skipped++;
        continue;
      }

      const imageBuffer = await downloadImage(page, msg.imageDataUrl);
      if (!imageBuffer) {
        console.log(`  Failed to download image from ${msg.sender}`);
        skipped++;
        continue;
      }

      // Upload to storage
      const screenshotUrl = await uploadScreenshot(imageBuffer, raceId, memberId);

      // Create entry
      const entryId = await createEntry(raceId, memberId, screenshotUrl, whatsappTs);
      console.log(`  Created entry for ${msg.sender}: ${entryId}`);

      // Trigger extraction
      await triggerExtraction(entryId);
      processed++;
    }

    console.log(
      `\nDone! Processed: ${processed}, Skipped: ${skipped}`
    );
  } catch (err) {
    console.error("Scraper error:", err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
