import { Router, type IRouter } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import { writeDesignFiles } from "../lib/design-writer";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.post("/api/fix-design", async (req, res) => {
  try {
    const settings = (await db.select().from(settingsTable))[0];
    if (!settings) {
      res.status(500).json({ error: "Settings not configured" });
      return;
    }

    const { ollamaUrl, ollamaModel, sharedDesignsPath } = settings;

    if (!ollamaUrl || !ollamaModel) {
      res.status(400).json({ error: "Ollama URL and model must be configured in Settings" });
      return;
    }
    if (!sharedDesignsPath) {
      res.status(400).json({ error: "Shared designs path must be configured in Settings" });
      return;
    }

    // Read the current script from disk
    const pyPath = join(sharedDesignsPath, "latest_design.py");
    let currentScript: string;
    try {
      currentScript = await readFile(pyPath, "utf8");
    } catch {
      res.status(404).json({ error: "No design script found. Generate a model first." });
      return;
    }

    // Optional error message the user can pass from the viewer
    const errorMsg: string = typeof req.body?.error === "string" ? req.body.error.trim() : "";

    const systemPrompt = `You are a CadQuery expert. You will be given a Python CadQuery script that has an error.
Fix the script so it runs without errors.
Rules:
- Line 1: import cadquery as cq
- Line 2: from cq_server.ui import ui, show_object
- Define ALL variables before using them.
- Use ONLY stable Workplane operations: box(), cylinder(), sphere(), union(), cut(), intersect(), fillet(), chamfer(), translate(), rotate(), extrude(), revolve().
- Do NOT use workplaneFromObject(), copyWorkplane(), or any deprecated methods.
- Second to last line: result = <the final CadQuery object>
- Last line: show_object(result)
- Do NOT call exporters, save(), or any file-writing function.
- Return ONLY the corrected Python script — no explanations, no markdown fences.`;

    const userPrompt = errorMsg
      ? `This script produced the error: "${errorMsg}"\n\nFix it:\n\n${currentScript}`
      : `Review this CadQuery script and fix any errors (undefined variables, deprecated methods, syntax problems):\n\n${currentScript}`;

    const ollamaRes = await fetch(`${ollamaUrl.trim()}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      res.status(502).json({ error: `Ollama error: ${text}` });
      return;
    }

    const data = (await ollamaRes.json()) as { response?: string };
    const modelOutput = data.response ?? "";
    if (!modelOutput) {
      res.status(502).json({ error: "Ollama returned an empty response" });
      return;
    }

    await writeDesignFiles(sharedDesignsPath, modelOutput);

    res.json({ ok: true, modelOutput });
  } catch (err) {
    console.error("fix-design error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

export default router;
