import { Router } from "express";
import { google } from "googleapis";
import { isGmailConfigured } from "../lib/gmail.js";

const router = Router();

router.get("/status", async (req, res) => {
  const configured = isGmailConfigured();
  if (!configured) {
    res.json({ configured: false, email: null, error: "Missing Gmail environment variables." });
    return;
  }

  try {
    const oAuth2 = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
    );
    oAuth2.setCredentials({ refresh_token: process.env["GOOGLE_REFRESH_TOKEN"] });
    const gmail = google.gmail({ version: "v1", auth: oAuth2 });
    const profile = await gmail.users.getProfile({ userId: "me" });
    res.json({ configured: true, email: profile.data.emailAddress ?? null, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Gmail connection check failed");
    res.json({ configured: true, email: null, error: message });
  }
});

router.post("/send-test", async (req, res) => {
  if (!isGmailConfigured()) {
    res.status(400).json({ error: "Gmail is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN." });
    return;
  }

  try {
    const oAuth2 = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
    );
    oAuth2.setCredentials({ refresh_token: process.env["GOOGLE_REFRESH_TOKEN"] });
    const gmail = google.gmail({ version: "v1", auth: oAuth2 });

    const profile = await gmail.users.getProfile({ userId: "me" });
    const toEmail = profile.data.emailAddress!;

    const rawMessage = [
      `To: ${toEmail}`,
      `Subject: MailFlow AI — Test Email`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      "<h2>✅ Gmail is connected!</h2><p>Your MailFlow AI app is configured correctly and ready to send campaigns.</p>",
    ].join("\r\n");

    const encoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded } });
    res.json({ ok: true, sentTo: toEmail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Gmail test send failed");
    res.status(500).json({ error: message });
  }
});

export default router;
