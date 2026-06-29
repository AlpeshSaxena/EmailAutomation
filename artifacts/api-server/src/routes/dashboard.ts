import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable, emailTemplatesTable, emailLogsTable } from "@workspace/db";
import { count, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const [logStats] = await db
      .select({
        totalSent: sql<number>`SUM(CASE WHEN ${emailLogsTable.status} = 'sent' THEN 1 ELSE 0 END)`,
        totalFailed: sql<number>`SUM(CASE WHEN ${emailLogsTable.status} = 'failed' THEN 1 ELSE 0 END)`,
        totalPending: sql<number>`SUM(CASE WHEN ${emailLogsTable.status} = 'pending' THEN 1 ELSE 0 END)`,
      })
      .from(emailLogsTable);

    const [campaignCount] = await db.select({ total: count() }).from(campaignsTable);
    const [templateCount] = await db.select({ total: count() }).from(emailTemplatesTable);

    res.json({
      totalSent: Number(logStats?.totalSent ?? 0),
      totalFailed: Number(logStats?.totalFailed ?? 0),
      totalPending: Number(logStats?.totalPending ?? 0),
      totalCampaigns: Number(campaignCount?.total ?? 0),
      totalTemplates: Number(templateCount?.total ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const logs = await db
      .select()
      .from(emailLogsTable)
      .orderBy(desc(emailLogsTable.createdAt))
      .limit(30);

    const campaignIds = [...new Set(logs.map(l => l.campaignId))];
    let campaignNames: Record<number, string> = {};
    if (campaignIds.length > 0) {
      const campaigns = await db.select().from(campaignsTable);
      campaignNames = Object.fromEntries(campaigns.map(c => [c.id, c.name]));
    }

    res.json(logs.map(l => ({
      ...l,
      campaignName: campaignNames[l.campaignId] ?? null,
      createdAt: l.createdAt.toISOString(),
      sentAt: l.sentAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard activity");
    res.status(500).json({ error: "Failed to get dashboard activity" });
  }
});

router.get("/chart", async (req, res) => {
  try {
    const rows = await db
      .select({
        date: sql<string>`DATE(${emailLogsTable.createdAt})::text`,
        status: emailLogsTable.status,
        cnt: count(),
      })
      .from(emailLogsTable)
      .where(sql`${emailLogsTable.createdAt} >= NOW() - INTERVAL '7 days'`)
      .groupBy(sql`DATE(${emailLogsTable.createdAt})`, emailLogsTable.status);

    const byDate: Record<string, { sent: number; failed: number }> = {};
    for (const row of rows) {
      const d = row.date;
      if (!byDate[d]) byDate[d] = { sent: 0, failed: 0 };
      if (row.status === "sent") byDate[d]!.sent = Number(row.cnt);
      if (row.status === "failed") byDate[d]!.failed = Number(row.cnt);
    }

    const result = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard chart");
    res.status(500).json({ error: "Failed to get dashboard chart" });
  }
});

export default router;
