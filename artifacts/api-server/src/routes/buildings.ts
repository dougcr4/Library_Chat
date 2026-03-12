import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import {
  GetBuildingsCatalogueResponse,
  GenerateBuilding3DBody,
  GenerateBuilding3DResponse,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── SIP & Timber reference data ─────────────────────────────────────────────

const STANDARD_LENGTHS = [3600, 4200, 4800, 5100, 5400, 6000];

// Source: SIPs_Timber__info.pdf — SIP standard width 1222mm, lengths 2440/3050mm
// OSB figure is total both faces (2 × 11mm); EPS is core thickness
const SIP_THICKNESSES = [
  { id: "sip-97",  totalMm: 97,  osbMm: 22, epsMm: 75,  weightKg: 12.47, uValue: 0.25, label: "97mm  (OSB 22 + EPS 75)"  },
  { id: "sip-119", totalMm: 119, osbMm: 22, epsMm: 97,  weightKg: 15.30, uValue: 0.31, label: "119mm (OSB 22 + EPS 97)"  },
  { id: "sip-144", totalMm: 144, osbMm: 22, epsMm: 122, weightKg: 16.30, uValue: 0.25, label: "144mm (OSB 22 + EPS 122)" },
  { id: "sip-169", totalMm: 169, osbMm: 22, epsMm: 147, weightKg: 17.40, uValue: 0.21, label: "169mm (OSB 22 + EPS 147)" },
  { id: "sip-194", totalMm: 194, osbMm: 22, epsMm: 172, weightKg: 18.40, uValue: 0.18, label: "194mm (OSB 22 + EPS 172)" },
  { id: "sip-219", totalMm: 219, osbMm: 22, epsMm: 197, weightKg: 19.40, uValue: 0.15, label: "219mm (OSB 22 + EPS 197)" },
  { id: "sip-229", totalMm: 229, osbMm: 22, epsMm: 207, weightKg: 21.01, uValue: 0.11, label: "229mm (OSB 22 + EPS 207)" },
];

const TIMBER_SIZES = [
  { id: "t-25x50",   species: "redwood", widthMm: 25,  thicknessMm: 50,  csaMm2: 1250,  label: "25 × 50mm"  },
  { id: "t-47x47",   species: "redwood", widthMm: 47,  thicknessMm: 47,  csaMm2: 2209,  label: "47 × 47mm"  },
  { id: "t-47x75",   species: "redwood", widthMm: 47,  thicknessMm: 75,  csaMm2: 3525,  label: "47 × 75mm"  },
  { id: "t-47x100",  species: "redwood", widthMm: 47,  thicknessMm: 100, csaMm2: 4700,  label: "47 × 100mm" },
  { id: "t-47x125",  species: "redwood", widthMm: 47,  thicknessMm: 125, csaMm2: 5875,  label: "47 × 125mm" },
  { id: "t-47x150",  species: "redwood", widthMm: 47,  thicknessMm: 150, csaMm2: 7050,  label: "47 × 150mm" },
  { id: "t-47x175",  species: "redwood", widthMm: 47,  thicknessMm: 175, csaMm2: 8225,  label: "47 × 175mm" },
  { id: "t-47x200",  species: "redwood", widthMm: 47,  thicknessMm: 200, csaMm2: 9400,  label: "47 × 200mm" },
  { id: "t-47x225",  species: "redwood", widthMm: 47,  thicknessMm: 225, csaMm2: 10575, label: "47 × 225mm" },
  { id: "t-47x250",  species: "redwood", widthMm: 47,  thicknessMm: 250, csaMm2: 11750, label: "47 × 250mm" },
  { id: "t-75x75",   species: "redwood", widthMm: 75,  thicknessMm: 75,  csaMm2: 5625,  label: "75 × 75mm"  },
  { id: "t-75x100",  species: "redwood", widthMm: 75,  thicknessMm: 100, csaMm2: 7500,  label: "75 × 100mm" },
  { id: "t-75x150",  species: "redwood", widthMm: 75,  thicknessMm: 150, csaMm2: 11250, label: "75 × 150mm" },
  { id: "t-100x100", species: "redwood", widthMm: 100, thicknessMm: 100, csaMm2: 10000, label: "100 × 100mm"},
];

// ── Shell designs & sizes ───────────────────────────────────────────────────

const DESIGNS = [
  { id: "alpha",   code: "DDL-S01-A", name: "Alpha",   description: "Single-pitch lean-to style — clean, compact, modern profile" },
  { id: "beta",    code: "DDL-S01-B", name: "Beta",    description: "Apex roof — classic garden building symmetry" },
  { id: "charlie", code: "DDL-S01-C", name: "Charlie", description: "Hip roof — traditional four-slope finish, premium look" },
];

const SIZES = [
  {
    id: "small",    name: "Small",      label: "S",  approxWidth: 2440, approxLength: 3050,
    panelCount: 8,  planningFlag: false, buildingRegsFlag: false,
  },
  {
    id: "medium",   name: "Medium",     label: "M",  approxWidth: 3660, approxLength: 3660,
    panelCount: 12, planningFlag: false, buildingRegsFlag: false,
  },
  {
    id: "large",    name: "Large",      label: "L",  approxWidth: 4880, approxLength: 4880,
    panelCount: 16, planningFlag: true,  buildingRegsFlag: false,
  },
  {
    id: "xlarge",   name: "Extra Large", label: "XL", approxWidth: 6100, approxLength: 6100,
    panelCount: 20, planningFlag: true,  buildingRegsFlag: true,
  },
  {
    id: "bespoke",  name: "Bespoke",    label: "B",  approxWidth: null, approxLength: null,
    panelCount: null, planningFlag: true,  buildingRegsFlag: true,
  },
];

// ── Fit-out catalogue ───────────────────────────────────────────────────────
// Colour swatches shared across multiple products
const COLOURS_12 = Array.from({ length: 12 }, (_, i) => ({
  index: i + 1,
  label: `Colour ${i + 1}`,
  code: `C${String(i + 1).padStart(2, "0")}`,
}));

const FITOUT_SECTIONS = [
  {
    id: "exterior", code: "E", name: "Exterior",
    options: [
      {
        id: "roof-type", code: "E01", name: "Roof Type",
        products: [
          {
            id: "rubber", code: "DDL-1.01.01", name: "Rubber",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.01.01.${c.index}` })),
          },
          {
            id: "resin", code: "DDL-1.01.02", name: "Resin",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.01.02.${c.index}` })),
          },
          {
            id: "planted", code: "DDL-1.01.03", name: "Planted (Sedum)",
            cribbCodes: [
              { index: 1, label: "Wild Flower",   code: "DDL-1.01.03.1" },
              { index: 2, label: "Spring Copse",  code: "DDL-1.01.03.2" },
              { index: 3, label: "Meadow",        code: "DDL-1.01.03.3" },
            ],
          },
        ],
      },
      {
        id: "cladding", code: "E02", name: "Exterior Cladding",
        products: [
          {
            id: "feather-edge", code: "DDL-1.02.01", name: "Feather Edge",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.02.01.${c.index}` })),
          },
          {
            id: "shiplap", code: "DDL-1.02.02", name: "Shiplap",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.02.02.${c.index}` })),
          },
          {
            id: "waney-edge", code: "DDL-1.02.03", name: "Waney Edge",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.02.03.${c.index}` })),
          },
          {
            id: "recycled-clad", code: "DDL-1.02.04", name: "Recycled Cladding",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.02.04.${c.index}` })),
          },
        ],
      },
      {
        id: "decking", code: "E03", name: "Exterior Decking",
        products: [
          {
            id: "softwood-deck", code: "DDL-1.03.01", name: "Softwood Decking",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.03.01.${c.index}` })),
          },
          {
            id: "composite-deck", code: "DDL-1.03.02", name: "Composite Decking",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.03.02.${c.index}` })),
          },
          {
            id: "hardwood-deck", code: "DDL-1.03.03", name: "Hardwood Decking",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.03.03.${c.index}` })),
          },
        ],
      },
      {
        id: "glazing", code: "E04", name: "Glazing & Doors",
        products: [
          {
            id: "single-door", code: "DDL-1.04.01", name: "Single Door + Window",
            cribbCodes: [
              { index: 1, label: "Standard",        code: "DDL-1.04.01.1" },
              { index: 2, label: "French Door",     code: "DDL-1.04.01.2" },
              { index: 3, label: "Sliding Door",    code: "DDL-1.04.01.3" },
            ],
          },
          {
            id: "double-door", code: "DDL-1.04.02", name: "Double Doors + Windows",
            cribbCodes: [
              { index: 1, label: "Standard",        code: "DDL-1.04.02.1" },
              { index: 2, label: "Bi-fold Doors",   code: "DDL-1.04.02.2" },
              { index: 3, label: "Full Glazed",     code: "DDL-1.04.02.3" },
            ],
          },
          {
            id: "lantern-roof", code: "DDL-1.04.03", name: "Lantern Roof + Doors",
            cribbCodes: [
              { index: 1, label: "Standard",        code: "DDL-1.04.03.1" },
              { index: 2, label: "Large Lantern",   code: "DDL-1.04.03.2" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "interior", code: "N", name: "Interior",
    options: [
      {
        id: "insulation", code: "N01", name: "Additional Insulation",
        products: [
          {
            id: "no-extra-insulation", code: "DDL-2.01.01", name: "SIP Standard Only",
            cribbCodes: [{ index: 1, label: "As specified", code: "DDL-2.01.01.1" }],
          },
          {
            id: "pir-insulation", code: "DDL-2.01.02", name: "PIR Board Upgrade",
            cribbCodes: [
              { index: 1, label: "25mm PIR",   code: "DDL-2.01.02.1" },
              { index: 2, label: "50mm PIR",   code: "DDL-2.01.02.2" },
              { index: 3, label: "75mm PIR",   code: "DDL-2.01.02.3" },
            ],
          },
        ],
      },
      {
        id: "fitted-units", code: "N02", name: "Fitted Units",
        products: [
          {
            id: "no-units", code: "DDL-2.02.01", name: "None",
            cribbCodes: [{ index: 1, label: "No fitted units", code: "DDL-2.02.01.1" }],
          },
          {
            id: "shelving", code: "DDL-2.02.02", name: "Shelving",
            cribbCodes: [
              { index: 1, label: "Open Shelving",   code: "DDL-2.02.02.1" },
              { index: 2, label: "Closed Cabinets", code: "DDL-2.02.02.2" },
              { index: 3, label: "Full Wall Units",  code: "DDL-2.02.02.3" },
            ],
          },
          {
            id: "workbench", code: "DDL-2.02.03", name: "Workbench",
            cribbCodes: [
              { index: 1, label: "Single Bench", code: "DDL-2.02.03.1" },
              { index: 2, label: "L-Shaped",     code: "DDL-2.02.03.2" },
            ],
          },
        ],
      },
      {
        id: "electrical-install", code: "N03", name: "Electrical Installation",
        products: [
          {
            id: "no-electrics", code: "DDL-2.03.01", name: "No Electrics",
            cribbCodes: [{ index: 1, label: "None", code: "DDL-2.03.01.1" }],
          },
          {
            id: "basic-electrics", code: "DDL-2.03.02", name: "Basic (Lights + Sockets)",
            cribbCodes: [
              { index: 1, label: "2 Sockets + 1 Light", code: "DDL-2.03.02.1" },
              { index: 2, label: "4 Sockets + 2 Lights", code: "DDL-2.03.02.2" },
            ],
          },
          {
            id: "full-electrics", code: "DDL-2.03.03", name: "Full Electrical Fit-out",
            cribbCodes: [
              { index: 1, label: "Consumer Unit + Full Ring", code: "DDL-2.03.03.1" },
              { index: 2, label: "Smart Controls",            code: "DDL-2.03.03.2" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "finishes", code: "F", name: "Finishes",
    options: [
      {
        id: "flooring", code: "F01", name: "Floor Coverings",
        products: [
          {
            id: "bare-floor", code: "DDL-3.01.01", name: "Bare OSB/Screed",
            cribbCodes: [{ index: 1, label: "As laid", code: "DDL-3.01.01.1" }],
          },
          {
            id: "vinyl-floor", code: "DDL-3.01.02", name: "Vinyl / LVT",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-3.01.02.${c.index}` })),
          },
          {
            id: "engineered-wood", code: "DDL-3.01.03", name: "Engineered Wood",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-3.01.03.${c.index}` })),
          },
          {
            id: "carpet", code: "DDL-3.01.04", name: "Carpet",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-3.01.04.${c.index}` })),
          },
        ],
      },
      {
        id: "window-treatment", code: "F02", name: "Window Treatment",
        products: [
          {
            id: "no-blinds", code: "DDL-3.02.01", name: "None",
            cribbCodes: [{ index: 1, label: "None", code: "DDL-3.02.01.1" }],
          },
          {
            id: "roller-blinds", code: "DDL-3.02.02", name: "Roller Blinds",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-3.02.02.${c.index}` })),
          },
          {
            id: "wooden-shutters", code: "DDL-3.02.03", name: "Wooden Shutters",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-3.02.03.${c.index}` })),
          },
        ],
      },
      {
        id: "painting", code: "F03", name: "Painting & Decorating",
        products: [
          {
            id: "no-paint", code: "DDL-3.03.01", name: "No Finish",
            cribbCodes: [{ index: 1, label: "Unfinished", code: "DDL-3.03.01.1" }],
          },
          {
            id: "farrow-ball", code: "DDL-3.03.02", name: "Farrow & Ball",
            cribbCodes: Array.from({ length: 12 }, (_, i) => ({
              index: i + 1,
              label: ["All White", "Pointing", "Elephant's Breath", "Cornforth White",
                "Pavilion Gray", "Purbeck Stone", "Strong White", "Old White",
                "Off-Black", "Pitch Black", "Hague Blue", "Calke Green"][i],
              code: `DDL-3.03.02.${i + 1}`,
            })),
          },
          {
            id: "dulux", code: "DDL-3.03.03", name: "Dulux",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-3.03.03.${c.index}` })),
          },
        ],
      },
    ],
  },
  {
    id: "utilities", code: "U", name: "Utilities",
    options: [
      {
        id: "guttering", code: "U01", name: "Guttering",
        products: [
          {
            id: "no-guttering", code: "DDL-4.01.01", name: "None",
            cribbCodes: [{ index: 1, label: "No guttering", code: "DDL-4.01.01.1" }],
          },
          {
            id: "half-round", code: "DDL-4.01.02", name: "Half-Round Gutter",
            cribbCodes: [
              { index: 1, label: "Black PVC",  code: "DDL-4.01.02.1" },
              { index: 2, label: "White PVC",  code: "DDL-4.01.02.2" },
              { index: 3, label: "Cast Iron",  code: "DDL-4.01.02.3" },
            ],
          },
          {
            id: "square-gutter", code: "DDL-4.01.03", name: "Square/Box Gutter",
            cribbCodes: [
              { index: 1, label: "Black PVC",  code: "DDL-4.01.03.1" },
              { index: 2, label: "Aluminium",  code: "DDL-4.01.03.2" },
            ],
          },
        ],
      },
      {
        id: "water-supply", code: "U02", name: "Water Supply",
        products: [
          {
            id: "no-water", code: "DDL-4.02.01", name: "No Water Supply",
            cribbCodes: [{ index: 1, label: "None", code: "DDL-4.02.01.1" }],
          },
          {
            id: "cold-feed", code: "DDL-4.02.02", name: "Cold Feed Only",
            cribbCodes: [
              { index: 1, label: "Standpipe",  code: "DDL-4.02.02.1" },
              { index: 2, label: "Sink",       code: "DDL-4.02.02.2" },
            ],
          },
          {
            id: "hot-cold", code: "DDL-4.02.03", name: "Hot & Cold",
            cribbCodes: [
              { index: 1, label: "Combi-fed",  code: "DDL-4.02.03.1" },
              { index: 2, label: "Boiler-fed", code: "DDL-4.02.03.2" },
            ],
          },
        ],
      },
      {
        id: "electrical-supply", code: "U03", name: "Electrical Supply",
        products: [
          {
            id: "no-supply", code: "DDL-4.03.01", name: "No Supply",
            cribbCodes: [{ index: 1, label: "None", code: "DDL-4.03.01.1" }],
          },
          {
            id: "single-phase", code: "DDL-4.03.02", name: "Single Phase 240V",
            cribbCodes: [
              { index: 1, label: "16A",  code: "DDL-4.03.02.1" },
              { index: 2, label: "32A",  code: "DDL-4.03.02.2" },
              { index: 3, label: "63A",  code: "DDL-4.03.02.3" },
            ],
          },
          {
            id: "three-phase", code: "DDL-4.03.03", name: "Three Phase 415V",
            cribbCodes: [
              { index: 1, label: "63A", code: "DDL-4.03.03.1" },
            ],
          },
        ],
      },
      {
        id: "drainage", code: "U04", name: "Drainage",
        products: [
          {
            id: "no-drainage", code: "DDL-4.04.01", name: "No Drainage",
            cribbCodes: [{ index: 1, label: "None", code: "DDL-4.04.01.1" }],
          },
          {
            id: "soakaway", code: "DDL-4.04.02", name: "Soakaway",
            cribbCodes: [
              { index: 1, label: "Standard", code: "DDL-4.04.02.1" },
              { index: 2, label: "Large",    code: "DDL-4.04.02.2" },
            ],
          },
          {
            id: "mains-drain", code: "DDL-4.04.03", name: "Mains Drainage Connection",
            cribbCodes: [
              { index: 1, label: "Surface Water", code: "DDL-4.04.03.1" },
              { index: 2, label: "Foul Water",    code: "DDL-4.04.03.2" },
              { index: 3, label: "Both",          code: "DDL-4.04.03.3" },
            ],
          },
        ],
      },
    ],
  },
];

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/buildings/catalogue", (_req, res) => {
  const data = GetBuildingsCatalogueResponse.parse({
    designs: DESIGNS,
    sizes: SIZES,
    sipThicknesses: SIP_THICKNESSES,
    timberSizes: TIMBER_SIZES,
    standardLengths: STANDARD_LENGTHS,
    fitoutSections: FITOUT_SECTIONS,
  });
  res.json(data);
});

router.post("/buildings/generate", async (req, res) => {
  try {
    const body = GenerateBuilding3DBody.parse(req.body);

    let settings = await db.select().from(settingsTable).where(eq(settingsTable.id, "default")).then(r => r[0]);
    if (!settings) {
      settings = {
        id: "default",
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "qwen2.5",
        openWebUiUrl: "http://localhost:3001",
        cadqueryViewerUrl: "http://localhost:5000",
        jupyterLabUrl: "http://localhost:8888",
        sharedDesignsPath: "/home/douglas/DockerProjects/LLM-3D/shared_designs",
        updatedAt: new Date(),
      };
    }

    const design = DESIGNS.find(d => d.id === body.designId);
    const size   = SIZES.find(s => s.id === body.sizeId);
    const sip    = SIP_THICKNESSES.find(t => t.id === body.sipThicknessId);

    // Build a human-readable fit-out summary for the prompt
    const fitoutSummary = body.fitoutSelections.map(sel => {
      const section = FITOUT_SECTIONS.find(s => s.id === sel.sectionId);
      const option  = section?.options.find(o => o.id === sel.optionId);
      const product = option?.products.find(p => p.id === sel.productId);
      const crib    = product?.cribbCodes.find(c => c.code === sel.cribbCode);
      return [
        section?.name,
        option?.name,
        product?.name,
        crib ? `(${crib.label} — ${crib.code})` : sel.cribbCode ? `(${sel.cribbCode})` : "",
      ].filter(Boolean).join(" → ");
    }).join("\n  ");

    const systemPrompt = `You are a CadQuery 3D modelling expert specialising in SIP (Structural Insulated Panel) garden buildings.
Generate a complete Python CadQuery script that models the building shell described below.
SIP standard dimensions: width 1222mm, lengths 2440mm or 3050mm.
Use the provided SIP thickness and size to calculate overall building dimensions.
The script must be complete, runnable, and use CadQuery best practices.
Include all imports. Output ONLY the Python script, no explanations.`;

    const userPrompt = [
      `Shell design: ${design?.name ?? body.designId} (${design?.code ?? ""}) — ${design?.description ?? ""}`,
      `Size: ${size?.name ?? body.sizeId}${size?.approxWidth ? ` (~${size.approxWidth} × ${size.approxLength}mm)` : ""}`,
      `SIP panel: ${sip?.label ?? body.sipThicknessId} (standard panel width 1222mm)`,
      body.fitoutSelections.length > 0 ? `Fit-out selections:\n  ${fitoutSummary}` : "",
      body.additionalNotes ? `Additional notes: ${body.additionalNotes}` : "",
    ].filter(Boolean).join("\n");

    let modelOutput: string | null = null;
    let status: "complete" | "error" = "complete";
    let errorMsg: string | null = null;

    try {
      const ollamaResponse = await fetch(`${settings.ollamaUrl}/api/generate`, {
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

      if (!ollamaResponse.ok) throw new Error(`Ollama responded with ${ollamaResponse.status}`);

      const ollamaData = await ollamaResponse.json() as { response?: string };
      modelOutput = ollamaData.response ?? null;
    } catch (err) {
      console.error("Ollama error:", err);
      status = "error";
      errorMsg = err instanceof Error ? err.message : "Failed to connect to Ollama";
    }

    const jobId = `SIP${Date.now()}`;

    const data = GenerateBuilding3DResponse.parse({
      jobId,
      status,
      stage: status === "complete" ? "Script generated" : "Connection failed",
      modelOutput,
      estimatedSeconds: null,
      error: errorMsg,
    });

    res.json(data);
  } catch (err) {
    console.error("Generate building error:", err);
    res.status(400).json({ error: "bad_request", message: String(err) });
  }
});

export default router;
