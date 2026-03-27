import { chromium, type Browser, type Page } from "playwright";
import { CONFIG } from "./config";
import fs from "fs";
import path from "path";

const AUTH_STATE_FILE = path.join(CONFIG.authDir, "state.json");

export async function launchBrowser(): Promise<{
  browser: Browser;
  page: Page;
}> {
  // Ensure auth directory exists
  if (!fs.existsSync(CONFIG.authDir)) {
    fs.mkdirSync(CONFIG.authDir, { recursive: true });
  }

  const hasAuth = fs.existsSync(AUTH_STATE_FILE);

  const browser = await chromium.launch({
    headless: false, // Must be visible for QR code scan
  });

  const context = await browser.newContext(
    hasAuth ? { storageState: AUTH_STATE_FILE } : {}
  );

  const page = await context.newPage();
  await page.goto("https://web.whatsapp.com");

  // Possible selectors for "logged in" state - WhatsApp changes these often
  const loggedInSelectors = [
    '[aria-label="Chat list"]',
    '[data-testid="chat-list"]',
    '#pane-side',
    'div[data-testid="cell-frame-container"]',
    '[aria-label="Chats"]',
  ];

  const loggedInSelector = loggedInSelectors.join(", ");

  // Wait for either logged-in state or QR code
  console.log("Waiting for WhatsApp Web to load...");

  const chatListOrQR = await Promise.race([
    page.waitForSelector(loggedInSelector, { timeout: 60000 }).then(() => "chat_list"),
    page.waitForSelector('canvas', { timeout: 60000 }).then(() => "qr_code"),
  ]).catch(() => "timeout");

  if (chatListOrQR === "qr_code" || chatListOrQR === "timeout") {
    // Take a screenshot so user can see the state
    await page.screenshot({ path: path.join(CONFIG.authDir, "debug-login.png") });
    console.log("\n--- Scan the QR code in the browser window ---");
    console.log("(Screenshot saved to scraper/.auth/debug-login.png)\n");

    // Wait for successful login with broader selector
    await page.waitForSelector(loggedInSelector, { timeout: 120000 });

    // Save auth state
    await context.storageState({ path: AUTH_STATE_FILE });
    console.log("Auth saved. Next run will skip QR scan.\n");
  } else {
    await context.storageState({ path: AUTH_STATE_FILE });
    console.log("Loaded from saved session.\n");
  }

  return { browser, page };
}

export async function navigateToGroup(page: Page): Promise<void> {
  // The search box is a regular input or a p element with placeholder text
  // Click the search area first to activate it
  const searchArea = page.locator('p.selectable-text[data-tab="3"], [role="textbox"][data-tab="3"], p[class*="selectable"]').first();

  // If that doesn't work, try clicking the search bar by placeholder text
  let searchBox;
  try {
    await searchArea.click({ timeout: 5000 });
    searchBox = searchArea;
    console.log("Found search box via selectable-text");
  } catch {
    // Fallback: click the visible search bar area
    const searchBar = page.getByPlaceholder("Search or start a new chat");
    await searchBar.click({ timeout: 5000 });
    searchBox = searchBar;
    console.log("Found search box via placeholder");
  }

  await searchBox.click();
  await searchBox.pressSequentially(CONFIG.groupName, { delay: 50 });
  await page.waitForTimeout(2000);

  // Click the group in search results - try multiple selectors
  const groupResult = page.locator(`span[title="${CONFIG.groupName}"]`).first();
  try {
    await groupResult.click({ timeout: 5000 });
  } catch {
    // Fallback: look for any matching text in the list
    const altResult = page.locator(`text="${CONFIG.groupName}"`).first();
    await altResult.click({ timeout: 5000 });
  }
  await page.waitForTimeout(1000);

  console.log(`Navigated to group: ${CONFIG.groupName}`);
}

export interface ScrapedMessage {
  sender: string;
  timestamp: string;
  hasImage: boolean;
  imageDataUrl?: string;
}

export async function scrapeGroupMembers(page: Page): Promise<string[]> {
  // Click the group header to open group info
  const header = page.locator("header").first();
  await header.click();
  await page.waitForTimeout(1500);

  // Get member names from the group info panel
  const memberElements = page.locator(
    '[data-testid="cell-frame-title"] span[dir="auto"]'
  );
  const count = await memberElements.count();
  const members: string[] = [];

  for (let i = 0; i < count; i++) {
    const name = await memberElements.nth(i).textContent();
    if (name && name !== "You") {
      members.push(name.trim());
    }
  }

  // Close the panel by pressing Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  console.log(`Found ${members.length} group members`);
  return members;
}

export async function scrapeProfilePicture(
  page: Page,
  memberName: string
): Promise<string | null> {
  try {
    // This is best-effort - WhatsApp Web makes it tricky to get profile pics
    // The avatar images in the group info panel are the most accessible
    const avatar = page.locator(
      `img[alt="${memberName}"]`
    ).first();
    const src = await avatar.getAttribute("src", { timeout: 2000 });
    return src;
  } catch {
    return null;
  }
}

export async function scrapeMessages(
  page: Page,
  scrollCount: number = 10
): Promise<ScrapedMessage[]> {
  const messages: ScrapedMessage[] = [];

  // Scroll up to load more messages
  const messageList = page.locator('[data-testid="conversation-panel-messages"]');

  for (let i = 0; i < scrollCount; i++) {
    await messageList.evaluate((el) => {
      el.scrollTop -= 500;
    });
    await page.waitForTimeout(800);
  }

  // Scroll back to bottom
  await messageList.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(500);

  // Get all message containers
  const messageRows = page.locator('[data-testid="msg-container"]');
  const count = await messageRows.count();

  console.log(`Processing ${count} messages...`);

  for (let i = 0; i < count; i++) {
    const row = messageRows.nth(i);

    try {
      // Get sender name (only present in group chats)
      const senderEl = row.locator('[data-testid="msg-meta"] span[dir="auto"]').first();
      const sender = await senderEl.textContent({ timeout: 500 }).catch(() => null);

      // Get timestamp
      const timeEl = row.locator('[data-testid="msg-meta"] span[data-testid="msg-time"]');
      const timestamp = await timeEl.textContent({ timeout: 500 }).catch(() => null);

      // Check for image
      const hasImage = (await row.locator("img[src*='blob:']").count()) > 0;

      if (sender && timestamp) {
        const msg: ScrapedMessage = {
          sender: sender.trim(),
          timestamp: timestamp.trim(),
          hasImage,
        };

        if (hasImage) {
          // Try to get the image
          try {
            const imgEl = row.locator("img[src*='blob:']").first();
            // Click to open the full image
            await imgEl.click();
            await page.waitForTimeout(1000);

            // Get the full-res image from the viewer
            const fullImg = page.locator('[data-testid="image-thumb"]').first();
            const src = await fullImg.getAttribute("src", { timeout: 3000 });
            if (src) {
              msg.imageDataUrl = src;
            }

            // Close the viewer
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);
          } catch {
            // Image extraction failed, skip
          }
        }

        messages.push(msg);
      }
    } catch {
      // Skip messages that can't be parsed
    }
  }

  console.log(
    `Scraped ${messages.length} messages (${messages.filter((m) => m.hasImage).length} with images)`
  );
  return messages;
}

export async function downloadImage(
  page: Page,
  imageUrl: string
): Promise<Buffer | null> {
  try {
    const response = await page.request.get(imageUrl);
    return Buffer.from(await response.body());
  } catch {
    return null;
  }
}
