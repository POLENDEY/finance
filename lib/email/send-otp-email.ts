import nodemailer from "nodemailer";

type SendOtpResult =
  | { success: true; devDelivery?: true; devDeliveryReason?: string }
  | { error: string };

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function normalizeSmtpPass(pass: string) {
  return pass.replace(/\s+/g, "");
}

function formatSmtpError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Failed to send email.";

  if (/535|BadCredentials|Username and Password not accepted/i.test(message)) {
    return "Gmail rejected the SMTP login. Use a Google App Password (not your normal Gmail password), paste it without spaces in SMTP_PASS, and restart the dev server.";
  }

  return message;
}

function getSmtpFromAddress() {
  const from = process.env.EMAIL_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();

  if (from && from.includes("<")) {
    return from;
  }

  if (from && from.includes("@")) {
    return `Finance Tracker <${from}>`;
  }

  if (user) {
    return `Finance Tracker <${user}>`;
  }

  return "Finance Tracker";
}

export function isEmailConfigured() {
  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const hasSmtp = Boolean(
    process.env.SMTP_USER && process.env.SMTP_PASS
  );
  return hasResend || hasSmtp;
}

function getSmtpTransporter() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS
    ? normalizeSmtpPass(process.env.SMTP_PASS)
    : "";

  if (!user || !pass) {
    return null;
  }

  if (process.env.SMTP_SERVICE === "gmail") {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass },
    });
  }

  if (process.env.SMTP_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: { user, pass },
    });
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<SendOtpResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { error: "Resend is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { error: `Failed to send email: ${body.slice(0, 200)}` };
  }

  return { success: true };
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string
): Promise<SendOtpResult> {
  const transporter = getSmtpTransporter();
  const from = getSmtpFromAddress();

  if (!transporter) {
    return { error: "SMTP is not configured." };
  }

  try {
    await transporter.sendMail({ from, to, subject, html });
    return { success: true };
  } catch (error) {
    return {
      error: formatSmtpError(error),
    };
  }
}

export async function sendPasswordResetOtpEmail(
  to: string,
  username: string,
  otp: string
): Promise<SendOtpResult> {
  const subject = "Your Finance Tracker password reset code";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#059669;margin:0 0 16px">Password reset code</h2>
      <p>Hi ${username},</p>
      <p>Use this one-time code to reset your password. It expires in 10 minutes.</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;margin:24px 0">${otp}</p>
      <p style="color:#6b7280;font-size:14px">If you did not request this, you can ignore this email.</p>
    </div>
  `.trim();

  if (!isEmailConfigured()) {
    if (isDevelopment()) {
      console.info(
        `[dev] Password reset OTP for ${to} (${username}): ${otp}`
      );
      return { success: true, devDelivery: true, devDeliveryReason: "unconfigured" };
    }

    return {
      error:
        "Password reset email is not set up on the server. An administrator must configure one shared mail sender (Resend or SMTP) so codes can be delivered to each user's recovery email.",
    };
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const smtpResult = await sendViaSmtp(to, subject, html);
    if ("success" in smtpResult) {
      return smtpResult;
    }

    if (isDevelopment()) {
      console.warn(
        `[dev] SMTP failed (${smtpResult.error}). Showing OTP on screen instead.`
      );
      console.info(
        `[dev] Password reset OTP for ${to} (${username}): ${otp}`
      );
      return {
        success: true,
        devDelivery: true,
        devDeliveryReason: smtpResult.error,
      };
    }

    return smtpResult;
  }

  return sendViaResend(to, subject, html);
}
