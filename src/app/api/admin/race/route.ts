import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, goal_target, goal_unit } = body;

  if (!name || !goal_target) {
    return NextResponse.json(
      { error: "name and goal_target required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Create the race
  const { data: race, error } = await supabase
    .from("races")
    .insert({
      name,
      goal_target,
      goal_unit: goal_unit || "km",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-add all existing members to the race
  const { data: members } = await supabase.from("members").select("id");
  if (members && members.length > 0) {
    await supabase.from("race_members").insert(
      members.map((m) => ({
        race_id: race.id,
        member_id: m.id,
      }))
    );
  }

  return NextResponse.json({ race });
}
