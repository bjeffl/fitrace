import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RacerData, RaceStanding, Member, ActivityStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const raceId = req.nextUrl.searchParams.get("raceId");
  if (!raceId) {
    return NextResponse.json({ error: "raceId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get race details
  const { data: race } = await supabase
    .from("races")
    .select("*")
    .eq("id", raceId)
    .single();

  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  // Get all race members
  const { data: raceMembers } = await supabase
    .from("race_members")
    .select("member_id, members(*)")
    .eq("race_id", raceId);

  // Get standings from the view
  const { data: standings } = await supabase
    .from("race_standings")
    .select("*")
    .eq("race_id", raceId);

  const standingsMap = new Map(
    (standings || []).map((s: RaceStanding) => [s.member_id, s])
  );

  // Build racer data - include members with no posts as "sleeping"
  const racers: RacerData[] = (raceMembers || []).map((rm) => {
    const member = rm.members as unknown as Member;
    const standing = standingsMap.get(rm.member_id);

    return {
      race_id: raceId,
      member_id: rm.member_id,
      personal_best: standing?.personal_best ?? null,
      progress_pct: standing?.progress_pct ?? 0,
      total_posts: standing?.total_posts ?? 0,
      last_post_at: standing?.last_post_at ?? null,
      activity_status: (standing?.activity_status ?? "sleeping") as ActivityStatus,
      member,
    };
  });

  return NextResponse.json({ race, racers });
}
