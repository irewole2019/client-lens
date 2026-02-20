type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Minimal email sender.
 *
 * Production: wire this to SMTP (nodemailer) or an API provider.
 * Dev fallback: logs the email content to the server console.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const mode = (process.env.EMAIL_MODE || "console").toLowerCase();

  if (mode === "smtp") {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM;

    if (!host || !user || !pass || !from) {
      throw new Error(
        "Missing SMTP env vars. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM",
      );
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });

    return;
  }

  // Default dev behavior: log to console.
  // eslint-disable-next-line no-console
  console.log("\n--- EMAIL (console mode) ---");
  console.log("To:", input.to);
  console.log("Subject:", input.subject);
  console.log(input.text);
  console.log("--- END EMAIL ---\n");
}
