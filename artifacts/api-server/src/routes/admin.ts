import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_FITOUT_SECTIONS } from "./buildings";

const router: IRouter = Router();

router.get("/admin/catalogue", async (_req, res) => {
  try {
    const row = await db.select().from(settingsTable).where(eq(settingsTable.id, "default")).then(r => r[0]);
    const fitoutSections = row?.fitoutCatalogueJson
      ? JSON.parse(row.fitoutCatalogueJson)
      : DEFAULT_FITOUT_SECTIONS;
    res.json({ fitoutSections });
  } catch (e) {
    console.error("Admin GET catalogue error:", e);
    res.status(500).json({ error: "Failed to load catalogue" });
  }
});

router.put("/admin/catalogue", async (req, res) => {
  try {
    const { fitoutSections } = req.body;
    if (!Array.isArray(fitoutSections)) {
      return res.status(400).json({ error: "fitoutSections must be an array" });
    }
    const json = JSON.stringify(fitoutSections);
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.id, "default")).then(r => r[0]);
    if (existing) {
      await db.update(settingsTable)
        .set({ fitoutCatalogueJson: json, updatedAt: new Date() })
        .where(eq(settingsTable.id, "default"));
    } else {
      await db.insert(settingsTable).values({ id: "default", fitoutCatalogueJson: json });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("Admin PUT catalogue error:", e);
    res.status(500).json({ error: "Failed to save catalogue" });
  }
});

export default router;
