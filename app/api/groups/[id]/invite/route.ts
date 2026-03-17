import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;

  const body = await request.json().catch(() => ({})) as {
    email?: string;
    groupName?: string;
    groupSlug?: string;
    visibility?: string;
  };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
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

  // Verify caller is a member of this group
  const { data: membership } = await supabase
    .from("group_memberships")
    .select("player_id")
    .eq("group_id", groupId)
    .eq("player_id", profile.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const groupSlug = body.groupSlug ?? "";
  let inviteUrl = `${appUrl}/groups/${groupSlug}`;

  // For private groups, create a token so non-members can access the page
  if (body.visibility === "private") {
    const { data: invite, error: inviteError } = await supabase
      .from("group_invites")
      .insert({ group_id: groupId, created_by: profile.id })
      .select("token")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Failed to create invite token" }, { status: 500 });
    }

    inviteUrl = `${appUrl}/groups/${groupSlug}?token=${invite.token}`;
  }

  // Optionally send email
  if (body.email) {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const { default: GroupInvite } = await import("@/emails/GroupInvite");

        await resend.emails.send({
          from: "PKL <info@pkl-ball.app>",
          to: body.email,
          subject: `You're invited to join ${body.groupName ?? "a pickleball group"}`,
          react: GroupInvite({ groupName: body.groupName ?? "a group", inviteUrl }),
        });
      }
    } catch (err) {
      // Don't fail the whole request if email sending fails — return the URL anyway
      console.error("Failed to send group invite email:", err);
    }
  }

  return NextResponse.json({ url: inviteUrl });
}
