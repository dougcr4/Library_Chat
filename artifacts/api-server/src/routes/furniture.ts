import { Router, type IRouter } from "express";
import { writeDesignFiles } from "../lib/design-writer";
import { db } from "@workspace/db";
import { settingsTable, projectsTable } from "@workspace/db/schema";
import {
  GetFurnitureStylesResponse,
  GetFurnitureItemsResponse,
  GenerateFurniture3DBody,
  GenerateFurniture3DResponse,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const STYLES = [
  { id: "cotswold", name: "Cotswold", description: "Quintessentially English with honey-stone warmth and timeless charm" },
  { id: "rustic", name: "Rustic", description: "Natural, rough-hewn character with aged wood and earthy appeal" },
  { id: "contemporary", name: "Contemporary", description: "Clean lines, minimal ornamentation, sleek modern finish" },
  { id: "traditional", name: "Traditional", description: "Classic joinery with mortise and tenon, enduring craftsmanship" },
  { id: "mediterranean", name: "Mediterranean", description: "Sun-drenched relaxed style with curved forms and wrought-iron accents" },
  { id: "shaker", name: "Shaker", description: "Functional simplicity, honest materials, no unnecessary decoration" },
  { id: "victorian", name: "Victorian", description: "Ornate detailing, lattice work, and elaborate turned legs" },
  { id: "art-deco", name: "Art Deco", description: "Bold geometric patterns, luxurious materials, 1920s glamour" },
  { id: "modern-minimalist", name: "Modern Minimalist", description: "Stripped back, pure form, understated elegance" },
  { id: "country-garden", name: "Country Garden", description: "Relaxed cottage style, painted finishes, informal comfort" },
];

const ITEMS = [
  { id: "table", name: "Table", description: "Dining or occasional table for outdoor use", category: "Seating & Tables" },
  { id: "chair", name: "Chair", description: "Garden dining or accent chair", category: "Seating & Tables" },
  { id: "bench", name: "Bench", description: "Garden bench, single or double", category: "Seating & Tables" },
  { id: "lounger", name: "Lounger", description: "Sun lounger or reclining chair", category: "Seating & Tables" },
  { id: "swing-seat", name: "Swing Seat", description: "Hanging swing seat for two or more", category: "Seating & Tables" },
  { id: "bar-stool", name: "Bar Stool", description: "High stool for bar-height tables or counters", category: "Seating & Tables" },
  { id: "side-table", name: "Side Table", description: "Small occasional side or coffee table", category: "Seating & Tables" },
  { id: "planter-box", name: "Planter Box", description: "Raised planter for flowers, herbs or vegetables", category: "Garden Features" },
  { id: "pergola", name: "Pergola", description: "Open timber structure for climbing plants and shade", category: "Garden Features" },
  { id: "arbour", name: "Arbour", description: "Arched garden seat with trellis surround", category: "Garden Features" },
  { id: "trellis", name: "Trellis", description: "Decorative timber trellis panel or screen", category: "Garden Features" },
  { id: "storage-box", name: "Storage Box", description: "Outdoor storage chest for cushions, tools or toys", category: "Storage" },
];

router.get("/furniture/styles", (_req, res) => {
  const data = GetFurnitureStylesResponse.parse({ styles: STYLES });
  res.json(data);
});

router.get("/furniture/items", (_req, res) => {
  const data = GetFurnitureItemsResponse.parse({ items: ITEMS });
  res.json(data);
});

router.post("/furniture/generate", async (req, res) => {
  try {
    const body = GenerateFurniture3DBody.parse(req.body);

    let settings = await db.select().from(settingsTable).where(eq(settingsTable.id, "default")).then(r => r[0]);
    if (!settings) {
      settings = {
        id: "default",
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "qwen2.5:14b",
        openWebUiUrl: "http://localhost:3001",
        cadqueryViewerUrl: "http://localhost:5000",
        jupyterLabUrl: "http://localhost:8888",
        sharedDesignsPath: "/home/douglas/DockerProjects/LLM-3D/shared_designs",
        fitoutCatalogueJson: null,
        updatedAt: new Date(),
      };
    }

    const style = STYLES.find(s => s.id === body.styleId);
    const item = ITEMS.find(i => i.id === body.itemId);

    const systemPrompt = `You are a CadQuery 3D modelling expert specialising in garden furniture.
Generate a Python CadQuery script that creates a 3D model based on the user's description.
Rules:
- First line: import cadquery as cq
- Second line: from jupyter_cadquery.cadquery import show
- Use real dimensions from the prompt (in millimetres).
- Build the model using CadQuery workplane operations.
- Second to last line: result = <the final assembled model>
- Last line: show(result)
- Do NOT call exporters.export() or any file-saving function.
- Return ONLY the Python script with no explanation, no markdown fences.`;

    const userPrompt = [
      style ? `Style: ${style.name} - ${style.description}` : "",
      item ? `Furniture type: ${item.name}` : "",
      `Design requirements: ${body.prompt}`,
    ].filter(Boolean).join("\n");

    let modelOutput: string | null = null;
    let status: "complete" | "error" = "complete";
    let errorMsg: string | null = null;

    try {
      const ollamaResponse = await fetch(`${settings.ollamaUrl.trim()}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: settings.ollamaModel,
          system: systemPrompt,
          prompt: userPrompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama responded with ${ollamaResponse.status}`);
      }

      const ollamaData = await ollamaResponse.json() as { response?: string };
      modelOutput = ollamaData.response ?? null;

      if (modelOutput && settings.sharedDesignsPath) {
        try {
          await writeDesignFiles(settings.sharedDesignsPath, modelOutput);
        } catch (writeErr) {
          console.error("Failed to write design files:", writeErr);
        }
      }
    } catch (err) {
      console.error("Ollama error:", err);
      status = "error";
      errorMsg = err instanceof Error ? err.message : "Failed to connect to Ollama";
    }

    const jobId = `GF${Date.now()}`;

    const data = GenerateFurniture3DResponse.parse({
      jobId,
      status,
      stage: status === "complete" ? "Script generated" : "Connection failed",
      modelOutput,
      estimatedSeconds: null,
      error: errorMsg,
    });

    res.json(data);
  } catch (err) {
    console.error("Generate error:", err);
    res.status(400).json({ error: "bad_request", message: String(err) });
  }
});

export default router;
