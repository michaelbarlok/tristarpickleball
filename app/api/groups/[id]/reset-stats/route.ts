import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/groups/[id]/reset-stats
 *
 * Resets the free-play W/L records and point differentials by setting
 * stats_reset_at to now().  Existing match data is preserved but
 * the view filters it out.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Verify caller is a member
  const { data: membership } = await supabase
    .from("group_memberships")
    .select("player_id")
    .eq("group_id", groupId)
    .eq("player_id", profile.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }

  const { error } = await supabase
    .from("shootout_groups")
    .update({ stats_reset_at: new Date().toISOString() })
    .eq("id", groupId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Stats reset" });
}
