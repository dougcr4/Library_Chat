import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", async (_req, res) => {
  try {
    let [settings] = await db.select().from(settingsTable).where(
      (await import("drizzle-orm")).eq(settingsTable.id, "default")
    );

    if (!settings) {
      [settings] = await db.insert(settingsTable).values({
        id: "default",
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "qwen2.5",
        openWebUiUrl: "http://localhost:3001",
      }).returning();
    }

    const data = GetSettingsResponse.parse({
      ollamaUrl: settings.ollamaUrl,
      ollamaModel: settings.ollamaModel,
      openWebUiUrl: settings.openWebUiUrl,
    });
    res.json(data);
  } catch (err) {
    console.error("Error getting settings:", err);
    res.status(500).json({ error: "internal_error", message: "Failed to get settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const body = UpdateSettingsBody.parse(req.body);
    const { eq } = await import("drizzle-orm");

    const [updated] = await db.insert(settingsTable)
      .values({
        id: "default",
        ollamaUrl: body.ollamaUrl,
        ollamaModel: body.ollamaModel,
        openWebUiUrl: body.openWebUiUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: {
          ollamaUrl: body.ollamaUrl,
          ollamaModel: body.ollamaModel,
          openWebUiUrl: body.openWebUiUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    const data = UpdateSettingsResponse.parse({
      ollamaUrl: updated.ollamaUrl,
      ollamaModel: updated.ollamaModel,
      openWebUiUrl: updated.openWebUiUrl,
    });
    res.json(data);
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "internal_error", message: "Failed to update settings" });
  }
});

export default router;
