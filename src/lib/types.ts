export type ActivityStatus =
  | "sleeping"
  | "active"
  | "warm"
  | "cold"
  | "inactive"
  | "finished";

export type EntrySource = "scraper" | "manual";
export type EntryStatus =
  | "pending"
  | "extracted"
  | "failed"
  | "manual_override";

export interface Member {
  id: string;
  whatsapp_name: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Race {
  id: string;
  name: string;
  goal_target: number;
  goal_unit: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface RaceMember {
  race_id: string;
  member_id: string;
  joined_at: string;
}

export interface ProgressEntry {
  id: string;
  race_id: string;
  member_id: string;
  screenshot_url: string;
  extracted_value: number | null;
  extraction_raw: Record<string, unknown> | null;
  source: EntrySource;
  status: EntryStatus;
  whatsapp_ts: string | null;
  created_at: string;
}

export interface RaceStanding {
  race_id: string;
  member_id: string;
  personal_best: number | null;
  progress_pct: number;
  total_posts: number;
  last_post_at: string | null;
  activity_status: ActivityStatus;
}

export interface RacerData extends RaceStanding {
  member: Member;
}

export interface ExtractionResult {
  value: number | null;
  confidence: "high" | "medium" | "low" | "none";
  source_app?: string;
  raw_text?: string;
  reason?: string;
}
