import { Router, type IRouter } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import { writeDesignFiles } from "../lib/design-writer";
import { callLlm } from "../lib/llm-client";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.post("/refine-design", async (req, res) => {
  try {
    const settings = (await db.select().from(settingsTable))[0];
    if (!settings) {
      res.status(500).json({ error: "Settings not configured" });
      return;
    }

    const { ollamaUrl, openWebUiUrl, openWebUiApiKey, ollamaModel, sharedDesignsPath } = settings;

    if (!ollamaUrl || !ollamaModel) {
      res.status(400).json({ error: "Ollama URL and model must be configured in Settings" });
      return;
    }
    if (!sharedDesignsPath) {
      res.status(400).json({ error: "Shared designs path must be configured in Settings" });
      return;
    }

    const instruction: string = typeof req.body?.instruction === "string" ? req.body.instruction.trim() : "";
    if (!instruction) {
      res.status(400).json({ error: "Instruction is required" });
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

    const systemPrompt = `You are a CadQuery 3D modelling expert. You will be given an existing CadQuery Python script and an instruction to modify it.
Apply the modification precisely and return the complete updated script.

RULES (violations will crash the viewer):
- Line 1: import cadquery as cq
- Line 2: from cq_server.ui import ui, show_object
- Define ALL variables before using them.
- Use ONLY: box(), cylinder(), sphere(), union(), cut(), intersect(), fillet(), chamfer(), translate(), rotate().
- Use box() for ALL walls, floor, roof, and slab shapes.
- BANNED METHODS — never use: extrude(), revolve(), sweep(), shell(), workplaneFromObject(), copyWorkplane(), filterByZ(), filterByX(), filterByY(), faces(), edges(), wires(), rect(), circle(), pad(), pocket(), cutBlind(), BoundingBox().
- For roof slope in radians use ONLY the variable name slope_rad — never rename it.
- BANNED ATTRIBUTES — CadQuery Workplane objects have NO .X, .Y, .Z, .size, .height, .width, .depth attributes. NEVER access these. To change a dimension, edit the NUMBER inside the relevant box() or translate() call directly.
- To increase wall heights by N mm: add N to the third argument of each wall's box() call AND adjust the Z value in each wall's translate() call by N/2.
- Keep all parts of the script that the instruction does not change.
- Second to last line: result = <the final assembled CadQuery object>
- Last line: show_object(result)
- Do NOT call exporters, save(), or any file-writing function.
- Return ONLY the complete modified Python script — no explanations, no markdown fences.`;

    const userPrompt = `Current script:\n\`\`\`python\n${currentScript}\n\`\`\`\n\nInstruction: ${instruction}`;

    const modelOutput = await callLlm({
      ollamaUrl, openWebUiUrl, openWebUiApiKey,
      model: ollamaModel,
      systemPrompt, userPrompt,
      timeoutMs: 120_000,
    });

    await writeDesignFiles(sharedDesignsPath, modelOutput);

    res.json({ ok: true, modelOutput });
  } catch (err) {
    console.error("refine-design error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

export default router;
