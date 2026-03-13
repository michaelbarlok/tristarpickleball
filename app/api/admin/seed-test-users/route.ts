import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Allow up to 60 seconds for this admin route
export const maxDuration = 60;

const TEST_USERS = [
  "Alex Smith", "Jordan Johnson", "Taylor Williams", "Casey Brown", "Morgan Jones",
  "Riley Garcia", "Quinn Miller", "Avery Davis", "Cameron Rodriguez", "Drew Martinez",
  "Finley Anderson", "Harper Thomas", "Hayden Jackson", "Jesse White", "Kai Harris",
  "Lane Martin", "Micah Thompson", "Noel Moore", "Parker Young", "Peyton Allen",
  "Reese King", "River Wright", "Rowan Scott", "Sage Torres", "Skyler Hill",
  "Blake Green", "Charlie Adams", "Dakota Baker", "Emerson Nelson", "Frankie Carter",
  "Gray Mitchell", "Harley Perez", "Jaden Roberts", "Kendall Turner", "Logan Phillips",
  "Mackenzie Campbell", "Oakley Parker", "Phoenix Evans", "Spencer Edwards",
];

export async function POST(request: Request) {
  const url = new URL(request.url);
  const querySheetId = url.searchParams.get("sheetId");
  const body = await request.json().catch(() => ({}));
  const sheetId = querySheetId || body.sheetId;
  const supabase = await createClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 500 });
  }
  const serviceClient = await createServiceClient();

  // Find the sheet
  let sheet: { id: string; player_limit: number; group_id: string } | null = null;

  if (sheetId) {
    const { data } = await serviceClient
      .from("signup_sheets")
      .select("id, player_limit, group_id")
      .eq("id", sheetId)
      .single();
    sheet = data;
  } else {
    const { data } = await serviceClient
      .from("signup_sheets")
      .select("id, player_limit, group_id")
      .eq("status", "open")
      .order("event_date", { ascending: true })
      .limit(1)
      .single();
    sheet = data;
  }

  if (!sheet) {
    return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
  }

  // Step 1: Clean up any existing test data
  const { data: existingTest } = await serviceClient
    .from("profiles")
    .select("id, user_id")
    .like("display_name", "[TEST]%");

  if (existingTest && existingTest.length > 0) {
    const existingIds = existingTest.map((p) => p.id);
    const existingAuthIds = existingTest.map((p) => p.user_id).filter(Boolean);

    await serviceClient.from("registrations").delete().in("player_id", existingIds);
    await serviceClient.from("group_memberships").delete().in("player_id", existingIds);
    await serviceClient.from("profiles").delete().in("id", existingIds);

    // Delete auth users in parallel
    await Promise.allSettled(existingAuthIds.map((id) => serviceClient.auth.admin.deleteUser(id)));
  }

  // Clean up orphaned test auth users
  const { data: authUsers } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
  if (authUsers?.users) {
    const orphaned = authUsers.users.filter((u) => u.email?.endsWith("@test.local"));
    if (orphaned.length > 0) {
      await Promise.allSettled(orphaned.map((u) => serviceClient.auth.admin.deleteUser(u.id)));
    }
  }

  // Step 2: Create auth users in batches of 10 to avoid rate limits
  const BATCH_SIZE = 10;
  const created: { userId: string; index: number; step: number; pct: number }[] = [];

  for (let batch = 0; batch < TEST_USERS.length; batch += BATCH_SIZE) {
    const batchUsers = TEST_USERS.slice(batch, batch + BATCH_SIZE);
    const results = await Promise.allSettled(
      batchUsers.map((name, j) => {
        const i = batch + j;
        const [first, last] = name.split(" ");
        const email = `test-${first.toLowerCase()}-${last.toLowerCase()}@test.local`;
        return serviceClient.auth.admin.createUser({
          email,
          password: "testpassword123",
          email_confirm: true,
          user_metadata: { full_name: name },
        });
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value.data?.user) {
        created.push({
          userId: result.value.data.user.id,
          index: batch + j,
          step: Math.floor(Math.random() * 6) + 1,
          pct: Math.round((Math.random() * 40 + 50) * 10) / 10,
        });
      }
    }
  }

  if (created.length === 0) {
    return NextResponse.json({ error: "Failed to create any auth users" }, { status: 500 });
  }

  // Step 3: Bulk insert profiles
  const profileInserts = created.map((c) => {
    const [first, last] = TEST_USERS[c.index].split(" ");
    return {
      user_id: c.userId,
      full_name: `${first} ${last}`,
      display_name: `[TEST] ${first} ${last}`,
      email: `test-${first.toLowerCase()}-${last.toLowerCase()}@test.local`,
      role: "player" as const,
      is_active: true,
      member_since: new Date().toISOString(),
      preferred_notify: ["email"],
    };
  });

  const { data: inserted, error: insertErr } = await serviceClient
    .from("profiles")
    .insert(profileInserts)
    .select("id");

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  if (!inserted || inserted.length === 0) {
    return NextResponse.json({ error: "No profiles created" }, { status: 500 });
  }

  // Step 4: Create registrations and memberships
  const { count: existingConfirmed } = await serviceClient
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("sheet_id", sheet.id)
    .eq("status", "confirmed");

  const spotsLeft = sheet.player_limit - (existingConfirmed ?? 0);

  const registrations = inserted.map((p, i) => {
    const isConfirmed = i < spotsLeft;
    return {
      sheet_id: sheet.id,
      player_id: p.id,
      status: isConfirmed ? "confirmed" : "waitlist",
      waitlist_position: isConfirmed ? null : i - spotsLeft + 1,
      registered_by: profile.id,
    };
  });

  const { error: regErr } = await serviceClient
    .from("registrations")
    .insert(registrations);

  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 500 });
  }

  if (sheet.group_id) {
    const memberships = inserted.map((p, i) => ({
      player_id: p.id,
      group_id: sheet.group_id,
      current_step: created[i].step,
      win_pct: created[i].pct,
      total_sessions: Math.floor(Math.random() * 20) + 1,
      last_played_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    }));
    await serviceClient.from("group_memberships").insert(memberships);
  }

  return NextResponse.json({
    success: true,
    created: inserted.length,
    sheetId: sheet.id,
    confirmed: Math.min(inserted.length, spotsLeft),
    waitlisted: Math.max(0, inserted.length - spotsLeft),
  });
}
