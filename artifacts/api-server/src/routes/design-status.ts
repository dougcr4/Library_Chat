import { Router, type IRouter } from "express";
import { access } from "fs/promises";
import { join } from "path";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/design-status", async (_req, res) => {
  try {
    const settings = (await db.select().from(settingsTable))[0];
    if (!settings?.sharedDesignsPath) {
      res.json({ exists: false });
      return;
    }
    const pyPath = join(settings.sharedDesignsPath, "latest_design.py");
    try {
      await access(pyPath);
      res.json({ exists: true });
    } catch {
      res.json({ exists: false });
    }
  } catch {
    res.json({ exists: false });
  }
});

export default router;
