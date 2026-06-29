import { Router } from "express";
import { db } from "@workspace/db";
import {
  campaignsTable,
  recipientsTable,
  emailLogsTable,
  emailTemplatesTable,
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { sendEmail, personalizeTemplate, isGmailConfigured } from "../lib/gmail.js";

const router = Router();

async function buildCampaignWithCounts(campaignId: number) {
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId));
  if (!campaign) return null;

  const [stats] = await db
    .select({
      total: count(),
      sent: sql<number>`SUM(CASE WHEN ${recipientsTable.status} = 'sent' THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN ${recipientsTable.status} = 'failed' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN ${recipientsTable.status} = 'pending' THEN 1 ELSE 0 END)`,
    })
    .from(recipientsTable)
    .where(eq(recipientsTable.campaignId, campaignId));

  return {
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    sentCount: Number(stats?.sent ?? 0),
    failedCount: Number(stats?.failed ?? 0),
    pendingCount: Number(stats?.pending ?? 0),
    totalCount: Number(stats?.total ?? 0),
  };
}

router.get("/", async (req, res) => {
  try {
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .orderBy(campaignsTable.createdAt);

    const result = await Promise.all(campaigns.map(c => buildCampaignWithCounts(c.id)));
    res.json(result.filter(Boolean));
  } catch (err) {
    req.log.error({ err }, "Failed to list campaigns");
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, templateId } = req.body as { name: string; templateId?: number | null };
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [campaign] = await db
      .insert(campaignsTable)
      .values({ name, templateId: templateId ?? null, status: "draft" })
      .returning();
    const withCounts = await buildCampaignWithCounts(campaign!.id);
    res.status(201).json(withCounts);
  } catch (err) {
    req.log.error({ err }, "Failed to create campaign");
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const result = await buildCampaignWithCounts(id);
    if (!result) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign");
    res.status(500).json({ error: "Failed to get campaign" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const { name, templateId, status } = req.body as {
      name?: string;
      templateId?: number | null;
      status?: string;
    };
    const updates: Partial<typeof campaignsTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (templateId !== undefined) updates.templateId = templateId;
    if (status !== undefined) updates.status = status;

    const [campaign] = await db
      .update(campaignsTable)
      .set(updates)
      .where(eq(campaignsTable.id, id))
      .returning();
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    const withCounts = await buildCampaignWithCounts(id);
    res.json(withCounts);
  } catch (err) {
    req.log.error({ err }, "Failed to update campaign");
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    await db.delete(emailLogsTable).where(eq(emailLogsTable.campaignId, id));
    await db.delete(recipientsTable).where(eq(recipientsTable.campaignId, id));
    await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete campaign");
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

router.get("/:id/recipients", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const recipients = await db
      .select()
      .from(recipientsTable)
      .where(eq(recipientsTable.campaignId, id))
      .orderBy(recipientsTable.id);
    res.json(recipients.map(r => ({
      ...r,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list recipients");
    res.status(500).json({ error: "Failed to list recipients" });
  }
});

router.post("/:id/recipients", async (req, res) => {
  try {
    const campaignId = parseInt(req.params["id"] as string, 10);
    const { recipients } = req.body as {
      recipients: Array<{
        name: string;
        email: string;
        role?: string;
        domain?: string;
        organization?: string;
        metadata?: Record<string, string>;
      }>;
    };
    if (!recipients || !Array.isArray(recipients)) {
      res.status(400).json({ error: "recipients array is required" });
      return;
    }
    const rows = recipients.map(r => ({
      campaignId,
      name: r.name,
      email: r.email,
      role: r.role ?? null,
      domain: r.domain ?? null,
      organization: r.organization ?? null,
      metadata: r.metadata ?? null,
      status: "pending" as const,
    }));
    await db.insert(recipientsTable).values(rows);
    res.status(201).json({ count: rows.length });
  } catch (err) {
    req.log.error({ err }, "Failed to add recipients");
    res.status(500).json({ error: "Failed to add recipients" });
  }
});

router.get("/:id/stats", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const [stats] = await db
      .select({
        total: count(),
        sent: sql<number>`SUM(CASE WHEN ${recipientsTable.status} = 'sent' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${recipientsTable.status} = 'failed' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN ${recipientsTable.status} = 'pending' THEN 1 ELSE 0 END)`,
      })
      .from(recipientsTable)
      .where(eq(recipientsTable.campaignId, id));

    res.json({
      total: Number(stats?.total ?? 0),
      sent: Number(stats?.sent ?? 0),
      failed: Number(stats?.failed ?? 0),
      pending: Number(stats?.pending ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign stats");
    res.status(500).json({ error: "Failed to get campaign stats" });
  }
});

router.post("/:id/send", async (req, res) => {
  try {
    const campaignId = parseInt(req.params["id"] as string, 10);

    if (!isGmailConfigured()) {
      res.status(400).json({ error: "Gmail not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN." });
      return;
    }

    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, campaignId));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    let subject = "Campaign Email";
    let body = "Hello {{name}}!";

    if (campaign.templateId) {
      const [template] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, campaign.templateId));
      if (template) {
        subject = template.subject;
        body = template.body;
      }
    }

    await db
      .update(campaignsTable)
      .set({ status: "running" })
      .where(eq(campaignsTable.id, campaignId));

    const pendingRecipients = await db
      .select()
      .from(recipientsTable)
      .where(and(eq(recipientsTable.campaignId, campaignId), eq(recipientsTable.status, "pending")));

    res.json({ message: `Sending to ${pendingRecipients.length} recipients` });

    setImmediate(async () => {
      for (const recipient of pendingRecipients) {
        const vars: Record<string, string> = {
          name: recipient.name,
          email: recipient.email,
          role: recipient.role ?? "",
          domain: recipient.domain ?? "",
          organization: recipient.organization ?? "",
          ...(recipient.metadata ?? {}),
        };
        const personalizedSubject = personalizeTemplate(subject, vars);
        const personalizedBody = personalizeTemplate(body, vars);
        let status: "sent" | "failed" = "sent";
        let error: string | null = null;

        try {
          await sendEmail(recipient.email, personalizedSubject, personalizedBody);
        } catch (e) {
          status = "failed";
          error = e instanceof Error ? e.message : String(e);
        }

        await db
          .update(recipientsTable)
          .set({ status, error })
          .where(eq(recipientsTable.id, recipient.id));

        await db.insert(emailLogsTable).values({
          campaignId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: personalizedSubject,
          status,
          error,
          sentAt: status === "sent" ? new Date() : null,
        });
      }

      const remaining = await db
        .select()
        .from(recipientsTable)
        .where(and(eq(recipientsTable.campaignId, campaignId), eq(recipientsTable.status, "pending")));

      if (remaining.length === 0) {
        await db
          .update(campaignsTable)
          .set({ status: "done" })
          .where(eq(campaignsTable.id, campaignId));
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send campaign");
    res.status(500).json({ error: "Failed to send campaign" });
  }
});

router.post("/:id/retry", async (req, res) => {
  try {
    const campaignId = parseInt(req.params["id"] as string, 10);

    if (!isGmailConfigured()) {
      res.status(400).json({ error: "Gmail not configured." });
      return;
    }

    await db
      .update(recipientsTable)
      .set({ status: "pending", error: null })
      .where(and(eq(recipientsTable.campaignId, campaignId), eq(recipientsTable.status, "failed")));

    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, campaignId));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    let subject = "Campaign Email";
    let body = "Hello {{name}}!";

    if (campaign.templateId) {
      const [template] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, campaign.templateId));
      if (template) {
        subject = template.subject;
        body = template.body;
      }
    }

    await db
      .update(campaignsTable)
      .set({ status: "running" })
      .where(eq(campaignsTable.id, campaignId));

    const pendingRecipients = await db
      .select()
      .from(recipientsTable)
      .where(and(eq(recipientsTable.campaignId, campaignId), eq(recipientsTable.status, "pending")));

    res.json({ message: `Retrying ${pendingRecipients.length} failed recipients` });

    setImmediate(async () => {
      for (const recipient of pendingRecipients) {
        const vars: Record<string, string> = {
          name: recipient.name,
          email: recipient.email,
          role: recipient.role ?? "",
          domain: recipient.domain ?? "",
          organization: recipient.organization ?? "",
          ...(recipient.metadata ?? {}),
        };
        const personalizedSubject = personalizeTemplate(subject, vars);
        const personalizedBody = personalizeTemplate(body, vars);
        let status: "sent" | "failed" = "sent";
        let error: string | null = null;

        try {
          await sendEmail(recipient.email, personalizedSubject, personalizedBody);
        } catch (e) {
          status = "failed";
          error = e instanceof Error ? e.message : String(e);
        }

        await db
          .update(recipientsTable)
          .set({ status, error })
          .where(eq(recipientsTable.id, recipient.id));

        await db.insert(emailLogsTable).values({
          campaignId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: personalizedSubject,
          status,
          error,
          sentAt: status === "sent" ? new Date() : null,
        });
      }

      const remaining = await db
        .select()
        .from(recipientsTable)
        .where(and(eq(recipientsTable.campaignId, campaignId), eq(recipientsTable.status, "pending")));

      if (remaining.length === 0) {
        await db
          .update(campaignsTable)
          .set({ status: "done" })
          .where(eq(campaignsTable.id, campaignId));
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to retry campaign");
    res.status(500).json({ error: "Failed to retry campaign" });
  }
});

router.post("/:id/test-email", async (req, res) => {
  try {
    const campaignId = parseInt(req.params["id"] as string, 10);
    const { to } = req.body as { to: string };

    if (!isGmailConfigured()) {
      res.status(400).json({ error: "Gmail not configured." });
      return;
    }

    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, campaignId));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    let subject = "Test Email";
    let body = "This is a test email.";

    if (campaign.templateId) {
      const [template] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, campaign.templateId));
      if (template) {
        subject = `[TEST] ${template.subject}`;
        body = personalizeTemplate(template.body, {
          name: "Test User",
          email: to,
          role: "Tester",
          domain: "",
          organization: "Test Org",
        });
      }
    }

    await sendEmail(to, subject, body);
    res.json({ message: `Test email sent to ${to}` });
  } catch (err) {
    req.log.error({ err }, "Failed to send test email");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to send test email" });
  }
});

export default router;
