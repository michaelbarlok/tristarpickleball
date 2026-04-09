import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

interface EmailReceivedEvent {
  type: "email.received";
  created_at: string;
  data: {
    email_id: string;
    created_at: string;
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    message_id: string;
    attachments: {
      id: string;
      filename: string;
      content_type: string;
      content_disposition: string;
      content_id?: string;
    }[];
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  // Verify the webhook signature
  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: EmailReceivedEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, headers) as EmailReceivedEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({});
  }

  const forwardTo = process.env.FORWARD_TO_EMAIL;
  if (!forwardTo) {
    console.error("FORWARD_TO_EMAIL not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { from, to, subject, email_id } = event.data;
  const recipient = to[0] ?? "info@tristarpickleball.com";
  let html: string | undefined;
  let text: string | undefined;

  // Attempt 1: SDK get (works for sent emails, may work for received)
  try {
    const fetched = await resend.emails.get(email_id);
    if (fetched.data) {
      html = fetched.data.html ?? undefined;
      text = fetched.data.text ?? undefined;
      console.log("emails.get html length:", html?.length, "text length:", text?.length);
    } else {
      console.warn("emails.get returned no data:", JSON.stringify(fetched.error));
    }
  } catch (err) {
    console.warn("emails.get threw:", err);
  }

  // Attempt 2: direct REST call to possible received-email endpoint
  if (!html && !text) {
    try {
      const res = await fetch(`https://api.resend.com/emails/${email_id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const json = await res.json() as Record<string, unknown>;
      console.log("REST /emails/{id} status:", res.status, "keys:", Object.keys(json));
      html = json.html as string | undefined;
      text = json.text as string | undefined;
    } catch (err) {
      console.warn("REST fetch threw:", err);
    }
  }

  const bodyText = text
    ? `--- Forwarded from ${from} to ${recipient} ---\n\n${text}`
    : `--- Forwarded from ${from} to ${recipient} ---`;

  try {
    await resend.emails.send(
      html
        ? {
            from: `Tri-Star Pickleball <info@tristarpickleball.com>`,
            to: forwardTo,
            replyTo: from,
            subject: `Fwd: ${subject}`,
            html,
            text: bodyText,
          }
        : {
            from: `Tri-Star Pickleball <info@tristarpickleball.com>`,
            to: forwardTo,
            replyTo: from,
            subject: `Fwd: ${subject}`,
            text: bodyText,
          }
    );
  } catch (err) {
    console.error("Failed to forward email:", err);
    return NextResponse.json({ error: "Forward failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
