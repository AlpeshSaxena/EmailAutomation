import { Router } from "express";
import { db } from "@workspace/db";
import { emailTemplatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(emailTemplatesTable)
      .orderBy(emailTemplatesTable.createdAt);
    res.json(templates.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list templates");
    res.status(500).json({ error: "Failed to list templates" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, subject, body, tags } = req.body as {
      name: string;
      subject: string;
      body: string;
      tags?: string[];
    };
    if (!name || !subject || !body) {
      res.status(400).json({ error: "name, subject, and body are required" });
      return;
    }
    const [template] = await db
      .insert(emailTemplatesTable)
      .values({ name, subject, body, tags: tags ?? null })
      .returning();
    res.status(201).json({ ...template, createdAt: template!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create template");
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const [template] = await db
      .select()
      .from(emailTemplatesTable)
      .where(eq(emailTemplatesTable.id, id));
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json({ ...template, createdAt: template.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get template");
    res.status(500).json({ error: "Failed to get template" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const { name, subject, body, tags } = req.body as {
      name?: string;
      subject?: string;
      body?: string;
      tags?: string[];
    };
    const updates: Partial<typeof emailTemplatesTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (body !== undefined) updates.body = body;
    if (tags !== undefined) updates.tags = tags;

    const [template] = await db
      .update(emailTemplatesTable)
      .set(updates)
      .where(eq(emailTemplatesTable.id, id))
      .returning();
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json({ ...template, createdAt: template.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update template");
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete template");
    res.status(500).json({ error: "Failed to delete template" });
  }
});

export default router;
