import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult } from "./types";

const anthropic = new Anthropic();

export async function extractDistanceFromScreenshot(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  goalUnit: string = "km"
): Promise<ExtractionResult> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
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

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ExtractionResult;
  } catch {
    return {
      value: null,
      confidence: "none",
      reason: `Failed to parse response: ${text}`,
    };
  }
}
