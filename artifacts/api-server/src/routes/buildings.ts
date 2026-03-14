import { Router, type IRouter } from "express";
import { writeDesignFiles } from "../lib/design-writer";
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
  { id: "alpha",   code: "DDL-S01-A", name: "Alpha",   description: "Compact rectangular plan · flat roof · contemporary garden room" },
  { id: "beta",    code: "DDL-S01-B", name: "Beta",    description: "Extended rectangular plan · flat roof · generous open interior" },
  { id: "charlie", code: "DDL-S01-C", name: "Charlie", description: "Wide plan with integrated entrance canopy · flat roof · premium garden studio" },
];

// Source: SIP_Details.pdf rows 10-28
// Footprint < 15m² = no regs. 15–30m² = BR not required if ≥ 1m from boundary.
const SIZES = [
  {
    id: "small",    name: "Small",       label: "S",   approxWidth: 4000, approxLength: 3000,
    footprintM2: 12.00,   planningFlag: false, buildingRegsFlag: false,
    note: "Under 15m² — no planning or building regulations apply",
  },
  {
    id: "medium",   name: "Medium",      label: "M",   approxWidth: 4500, approxLength: 3500,
    footprintM2: 15.75,   planningFlag: false, buildingRegsFlag: false,
    note: "15–30m² — building regulations apply only if structure is within 1m of a boundary",
  },
  {
    id: "large",    name: "Large",       label: "L",   approxWidth: 5000, approxLength: 4000,
    footprintM2: 20.00,   planningFlag: false, buildingRegsFlag: true,
    note: "15–30m² — building regulations apply if structure is within 1m of a boundary",
  },
  {
    id: "xlarge",   name: "Extra Large", label: "XL",  approxWidth: 5500, approxLength: 4500,
    footprintM2: 24.75,   planningFlag: true,  buildingRegsFlag: true,
    note: "Over 15m² — building regulations apply",
  },
  {
    id: "bespoke",  name: "Bespoke",     label: "B",   approxWidth: null, approxLength: null,
    footprintM2: null,    planningFlag: true,  buildingRegsFlag: true,
    note: "Dimensions to be agreed — planning and building regulations advice required",
  },
];

// ── Fit-out catalogue ───────────────────────────────────────────────────────
// Colour palette — descriptive marketing names; codes are used for back-end config only
const COLOURS_12 = [
  { index: 1,  label: "Slate Grey",    code: "C01" },
  { index: 2,  label: "Forest Green",  code: "C02" },
  { index: 3,  label: "Autumn Gold",   code: "C03" },
  { index: 4,  label: "Birch White",   code: "C04" },
  { index: 5,  label: "Charcoal",      code: "C05" },
  { index: 6,  label: "Sage Mist",     code: "C06" },
  { index: 7,  label: "Driftwood",     code: "C07" },
  { index: 8,  label: "Pebble",        code: "C08" },
  { index: 9,  label: "Midnight Blue", code: "C09" },
  { index: 10, label: "Russet Brown",  code: "C10" },
  { index: 11, label: "Cream",         code: "C11" },
  { index: 12, label: "Lichen",        code: "C12" },
];

// Farrow & Ball signature colours
const FNB_COLOURS = [
  { index: 1,  label: "All White" },
  { index: 2,  label: "Pointing" },
  { index: 3,  label: "Elephant's Breath" },
  { index: 4,  label: "Cornforth White" },
  { index: 5,  label: "Pavilion Gray" },
  { index: 6,  label: "Purbeck Stone" },
  { index: 7,  label: "Strong White" },
  { index: 8,  label: "Old White" },
  { index: 9,  label: "Off-Black" },
  { index: 10, label: "Pitch Black" },
  { index: 11, label: "Hague Blue" },
  { index: 12, label: "Calke Green" },
];

// Helper — creates one painting substrate product (Walls / Woodwork / Ceiling)
// with three brand branches (F&B / Dulux / Osmo) each carrying 12 colour children.
function paintSubstrate(name: string, pCode: string) {
  const base = `DDL-3.03.${pCode}`;
  return {
    id: `paint-${pCode}`,
    code: base,
    name,
    cribbCodes: [
      {
        index: 1, label: "Farrow & Ball", code: `${base}.1`,
        children: FNB_COLOURS.map(c => ({ index: c.index, label: c.label, code: `${base}.1.${c.index}` })),
      },
      {
        index: 2, label: "Dulux", code: `${base}.2`,
        children: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `${base}.2.${c.index}` })),
      },
      {
        index: 3, label: "Osmo", code: `${base}.3`,
        children: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `${base}.3.${c.index}` })),
      },
    ],
  };
}

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
            id: "planted", code: "DDL-1.01.03", name: "Planted Roof",
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
        // Glazing areas are design-determined: Design 1 = door 2m²+win 1.89m²;
        // Design 2 adds one side window 1.89m²; Design 3 adds both side windows 1.89m² each.
        // E04 structure follows Excel: one option, four products — Colour / Spec / LHS / RHS.
        id: "glazing-bars", code: "E04", name: "Glazing & Door Bars",
        products: [
          {
            // 12-colour swatch for the aluminium glazing bar / door bar finish
            id: "glazi-bar-colour", code: "DDL-1.04.01", name: "Glazing Bar Colour",
            cribbCodes: COLOURS_12.map(c => ({ index: c.index, label: c.label, code: `DDL-1.04.01.${c.index}` })),
          },
          {
            // Glazing specification — flat DG variants; DG00 = shell default
            id: "glazing-spec", code: "DDL-1.04.02", name: "Glazing Spec",
            cribbCodes: [
              { index: 1, label: "DG00 · Shell Standard · Clear + Hardcoat low-E · 8+20mm · Air gap 12mm · U=1.90", code: "DDL-1.04.02.1" },
              { index: 2, label: "DG01 · Upgraded    · Clear + Softcoat low-E · 8+22mm · Air gap 16mm · U=1.50",    code: "DDL-1.04.02.2" },
              { index: 3, label: "DG03 · Minimal BR  · Clear + HP Softcoat    · 8+24mm · Air gap 18mm · U=1.40",    code: "DDL-1.04.02.3" },
              { index: 4, label: "DG04 · BR Compliant · Clear + HP Softcoat   · 8+28mm · Argon gap 20mm · U=1.10",  code: "DDL-1.04.02.4" },
            ],
          },
          {
            // Window orientation — left-hand side (hinge side)
            id: "lhs-orientation", code: "DDL-1.04.03", name: "LHS Orientation",
            cribbCodes: [
              { index: 1, label: "Horizontal", code: "DDL-1.04.03.1" },
              { index: 2, label: "Vertical",   code: "DDL-1.04.03.2" },
            ],
          },
          {
            // Window orientation — right-hand side
            id: "rhs-orientation", code: "DDL-1.04.04", name: "RHS Orientation",
            cribbCodes: [
              { index: 1, label: "Horizontal", code: "DDL-1.04.04.1" },
              { index: 2, label: "Vertical",   code: "DDL-1.04.04.2" },
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
        // Source: SIP_Details.pdf rows 30-35 — component option thicknesses
        // Spec 1: SIP shell + 12mm plasterboard  → walls 109mm / floors 109mm / roofs 109mm
        // Spec 2: SIP + extra EPS + board         → walls 119mm / floors 119mm / roofs 119mm
        // Spec 3: Min BR (SIP Boarded)            → walls 131mm / floors 131mm / roofs 131mm
        // Spec 4: Full BR (SIP's BR + Boarded)    → walls 206mm / floors 181mm / roofs 181mm
        id: "insulation", code: "N01", name: "Additional Insulation",
        products: [
          {
            id: "dls-1051", code: "DDL-1.05.1", name: "Board",
            cribbCodes: [{ index: 1, label: "SIP shell + 12mm plasterboard  ·  walls/floors/roofs 109mm", code: "DDL-1.05.1" }],
          },
          {
            id: "dls-1052", code: "DDL-1.05.2", name: "Board + Insulation",
            cribbCodes: [{ index: 1, label: "SIP + extra EPS + board  ·  walls/floors/roofs 119mm", code: "DDL-1.05.2" }],
          },
          {
            id: "dls-1053", code: "DDL-1.05.3", name: "Board + Min BR",
            cribbCodes: [{ index: 1, label: "Min BR spec  ·  walls 131mm / floors & roofs 131mm", code: "DDL-1.05.3" }],
          },
          {
            id: "dls-1054", code: "DDL-1.05.4", name: "Board + Max BR",
            cribbCodes: [{ index: 1, label: "Full BR spec  ·  walls 206mm / floors & roofs 181mm", code: "DDL-1.05.4" }],
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
        // Substrate → Brand → Colour (3-level cascade)
        // Products: Walls / Woodwork / Ceiling
        // Brands:   Farrow & Ball (F&B 12-colour palette) / Dulux / Osmo (both use COLOURS_12 placeholder)
        id: "painting", code: "F03", name: "Painting",
        products: [
          paintSubstrate("Walls",    "01"),
          paintSubstrate("Woodwork", "02"),
          paintSubstrate("Ceiling",  "03"),
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

// Export for use by admin route as the seeded default
export const DEFAULT_FITOUT_SECTIONS = FITOUT_SECTIONS;

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/buildings/catalogue", async (_req, res) => {
  let fitoutSections: unknown = FITOUT_SECTIONS;
  try {
    const row = await db.select().from(settingsTable).where(eq(settingsTable.id, "default")).then(r => r[0]);
    if (row?.fitoutCatalogueJson) {
      fitoutSections = JSON.parse(row.fitoutCatalogueJson);
    }
  } catch { /* fall back to hardcoded */ }

  // fitoutSections is served raw (not through Zod) so that recursive `children`
  // on CribbCode nodes are preserved rather than stripped by the strict schema.
  res.json({
    designs: DESIGNS,
    sizes: SIZES,
    sipThicknesses: SIP_THICKNESSES,
    timberSizes: TIMBER_SIZES,
    standardLengths: STANDARD_LENGTHS,
    fitoutSections,
  });
});

router.post("/buildings/generate", async (req, res) => {
  try {
    const body = GenerateBuilding3DBody.parse(req.body);

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
Rules:
- First line must be: import cadquery as cq
- SIP standard panel: width 1222mm, lengths 2440mm or 3050mm. Use the provided SIP thickness for wall depth.
- Use the provided size dimensions to calculate the overall building footprint.
- Build all walls, floor, and roof as CadQuery Workplane objects combined into a single assembly.
- The LAST line of the script MUST be: result = <the final assembled CadQuery object>
- Do NOT import or call jupyter_cadquery, show(), exporters, or any file-saving function.
- Return ONLY the raw Python script — no explanations, no markdown fences.`;

    const userPrompt = [
      `Shell design: ${design?.name ?? body.designId} (${design?.code ?? ""}) — ${design?.description ?? ""}`,
      `Size: ${size?.name ?? body.sizeId}${size?.approxWidth ? ` (~${size.approxWidth} × ${size.approxLength}mm)` : ""}`,
      sip ? `SIP panel: ${sip.label} (standard panel width 1222mm)` : "SIP panel: standard 144mm (OSB 22 + EPS 122, standard panel width 1222mm)",
      body.fitoutSelections.length > 0 ? `Fit-out selections:\n  ${fitoutSummary}` : "",
      body.additionalNotes ? `Additional notes: ${body.additionalNotes}` : "",
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

      if (!ollamaResponse.ok) throw new Error(`Ollama responded with ${ollamaResponse.status}`);

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
