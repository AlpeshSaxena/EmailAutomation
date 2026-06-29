import { Router } from "express";
import { db } from "@workspace/db";
import { emailLogsTable, campaignsTable } from "@workspace/db";
import { eq, desc, like, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campaignId, status, search } = req.query as {
      campaignId?: string;
      status?: string;
      search?: string;
    };

    const conditions = [];
    if (campaignId) conditions.push(eq(emailLogsTable.campaignId, parseInt(campaignId, 10)));
    if (status) conditions.push(eq(emailLogsTable.status, status));
    if (search) conditions.push(like(emailLogsTable.recipientEmail, `%${search}%`));

    const logs = await db
      .select()
      .from(emailLogsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(emailLogsTable.createdAt));

    const campaigns = await db.select().from(campaignsTable);
    const campaignNames = Object.fromEntries(campaigns.map(c => [c.id, c.name]));

    res.json(logs.map(l => ({
      ...l,
      campaignName: campaignNames[l.campaignId] ?? null,
      createdAt: l.createdAt.toISOString(),
      sentAt: l.sentAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list email logs");
    res.status(500).json({ error: "Failed to list email logs" });
  }
});

router.delete("/", async (req, res) => {
  try {
    await db.delete(emailLogsTable);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to clear email logs");
    res.status(500).json({ error: "Failed to clear email logs" });
  }
});

export default router;
