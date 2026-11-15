// Sending email (B-4.1). Owner: Engineer B.
//
// Without RESEND_API_KEY, emails are written to the server log instead of sent ("dev mode"),
// so the app works locally with no email account. With a key, Resend sends them.
//
// From: Resend only sends from a verified domain (plan-v3 open question 8).
//   - If iahv.org is verified, leave RESEND_FROM unset: mail comes from the admin's own address.
//   - Otherwise set RESEND_FROM=reminders@<verified-domain>: mail comes from that address with
//     the admin's name, and replies still go to the admin (Reply-To).

export type Person = { name: string; email: string };
export type OutgoingEmail = { from: Person; to: Person; subject: string; text: string };
export type SendResult = { id: string; mode: "resend" | "dev" };

export function emailMode(): "resend" | "dev" {
  return process.env.RESEND_API_KEY ? "resend" : "dev";
}

const address = (p: Person) => `${p.name.replace(/[<>"]/g, "")} <${p.email}>`;

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email · dev mode] From: ${address(msg.from)} To: ${address(msg.to)} Subject: ${msg.subject}`);
    return { id: `dev-${crypto.randomUUID()}`, mode: "dev" };
  }

  const { Resend } = await import("resend");
  const sender = process.env.RESEND_FROM;
  const { data, error } = await new Resend(key).emails.send({
    from: sender ? address({ name: msg.from.name, email: sender }) : address(msg.from),
    to: address(msg.to),
    replyTo: msg.from.email,
    subject: msg.subject,
    text: msg.text,
  });
  if (error || !data) throw new Error(error?.message ?? "Resend didn't accept the email.");
  return { id: data.id, mode: "resend" };
}
