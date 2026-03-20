import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const DEFAULTS = {
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "joshuaokolo/C3Dv0:latest",
  openWebUiUrl: "http://localhost:3001",
  openWebUiApiKey: "",
  cadqueryViewerUrl: "http://localhost:5000",
  jupyterLabUrl: "http://localhost:8888",
  jupyterLabWorkDir: "",
  sharedDesignsPath: "/home/douglas/DockerProjects/LLM-3D/shared_designs",
};

const router: IRouter = Router();

router.get("/settings", async (_req, res) => {
  try {
    let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, "default"));

    if (!settings) {
      [settings] = await db.insert(settingsTable).values({ id: "default", ...DEFAULTS }).returning();
    }

    const data = GetSettingsResponse.parse({
      ollamaUrl: settings.ollamaUrl,
      ollamaModel: settings.ollamaModel,
      openWebUiUrl: settings.openWebUiUrl,
      openWebUiApiKey: settings.openWebUiApiKey ?? "",
      cadqueryViewerUrl: settings.cadqueryViewerUrl,
      jupyterLabUrl: settings.jupyterLabUrl,
      jupyterLabWorkDir: settings.jupyterLabWorkDir ?? "",
      sharedDesignsPath: settings.sharedDesignsPath,
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

    // Strip undefined fields so partial updates don't overwrite existing values
    const patch = Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== undefined)
    );

    const [updated] = await db.insert(settingsTable)
      .values({ id: "default", ...DEFAULTS, ...patch, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: { ...patch, updatedAt: new Date() },
      })
      .returning();

    const data = UpdateSettingsResponse.parse({
      ollamaUrl: updated.ollamaUrl,
      ollamaModel: updated.ollamaModel,
      openWebUiUrl: updated.openWebUiUrl,
      openWebUiApiKey: updated.openWebUiApiKey ?? "",
      cadqueryViewerUrl: updated.cadqueryViewerUrl,
      jupyterLabUrl: updated.jupyterLabUrl,
      jupyterLabWorkDir: updated.jupyterLabWorkDir ?? "",
      sharedDesignsPath: updated.sharedDesignsPath,
    });
    res.json(data);
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "internal_error", message: "Failed to update settings" });
  }
});

export default router;
