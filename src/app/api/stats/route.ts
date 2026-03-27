import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");
  const raceId = req.nextUrl.searchParams.get("raceId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get member info
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Get all their progress entries for this race (or all races)
  let query = supabase
    .from("progress_entries")
    .select("*")
    .eq("member_id", memberId)
    .in("status", ["extracted", "manual_override"])
    .order("created_at", { ascending: true });

  if (raceId) {
    query = query.eq("race_id", raceId);
  }

  const { data: entries } = await query;

  // Compute stats
  const allDistances = (entries || [])
    .map((e) => e.extracted_value as number)
    .filter((v) => v != null);

  const personalBest = allDistances.length > 0 ? Math.max(...allDistances) : null;
  const totalDistance = allDistances.reduce((sum, v) => sum + v, 0);
  const totalRuns = allDistances.length;
  const averageDistance = totalRuns > 0 ? totalDistance / totalRuns : null;

  // Longest streak (consecutive days with runs)
  const runDates = (entries || [])
    .map((e) => new Date(e.created_at).toISOString().split("T")[0])
    .filter((v, i, a) => a.indexOf(v) === i) // unique dates
    .sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < runDates.length; i++) {
    const prev = new Date(runDates[i - 1]);
    const curr = new Date(runDates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  if (runDates.length > 0) {
    longestStreak = Math.max(longestStreak, 1);
    // Check if last run was today or yesterday for current streak
    const lastRun = new Date(runDates[runDates.length - 1]);
    const today = new Date();
    const daysSinceLastRun = Math.floor(
      (today.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24)
    );
    currentStreak = daysSinceLastRun <= 1 ? tempStreak : 0;
  }

  // Last run date
  const lastRunAt = entries && entries.length > 0
    ? entries[entries.length - 1].created_at
    : null;

  return NextResponse.json({
    member,
    stats: {
      personalBest,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalRuns,
      averageDistance: averageDistance ? Math.round(averageDistance * 100) / 100 : null,
      longestStreak,
      currentStreak,
      lastRunAt,
    },
    entries: entries || [],
  });
}
