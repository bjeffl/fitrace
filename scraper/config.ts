import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

export const CONFIG = {
  // WhatsApp group name to scrape
  groupName: process.env.WHATSAPP_GROUP_NAME || "superstar running team",

  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",

  // Playwright session storage
  authDir: path.join(__dirname, ".auth"),

  // How far back to look for messages (in days)
  lookbackDays: 30,

  // Base URL of the FitRace app (for triggering extraction)
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
};
