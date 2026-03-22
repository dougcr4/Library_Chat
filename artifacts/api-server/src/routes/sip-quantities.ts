import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── SIP standard panel dimensions ────────────────────────────────────────────
const PANEL_WIDTH_MM   = 1222;   // nominal panel width
const STOCK_LENGTHS_MM = [2440, 3050]; // available stock lengths (shortest first)

// ── Reference data (mirrors buildings.ts) ────────────────────────────────────
const DESIGNS = [
  { id: "alpha",   lhsWindowM2: 0,    rhsWindowM2: 0,    doorAreaM2: 2, frontWindowM2: 1.89 },
  { id: "beta",    lhsWindowM2: 1.89, rhsWindowM2: 0,    doorAreaM2: 2, frontWindowM2: 1.89 },
  { id: "charlie", lhsWindowM2: 1.89, rhsWindowM2: 1.89, doorAreaM2: 2, frontWindowM2: 1.89 },
];

const SIZES: Record<string, {
  name: string; frontHeightMm: number; backHeightMm: number; roofDropMm: number;
  deckingWidthMm: number; roofOvhFrontMm: number; roofOvhSidesMm: number;
}> = {
  small:  { name: "Small",       frontHeightMm: 2495, backHeightMm: 2345, roofDropMm: 150, deckingWidthMm: 900,  roofOvhFrontMm: 300, roofOvhSidesMm: 200 },
  medium: { name: "Medium",      frontHeightMm: 2550, backHeightMm: 2375, roofDropMm: 175, deckingWidthMm: 1000, roofOvhFrontMm: 300, roofOvhSidesMm: 200 },
  large:  { name: "Large",       frontHeightMm: 2660, backHeightMm: 2460, roofDropMm: 200, deckingWidthMm: 1250, roofOvhFrontMm: 300, roofOvhSidesMm: 200 },
  xlarge: { name: "Extra Large", frontHeightMm: 2700, backHeightMm: 2475, roofDropMm: 225, deckingWidthMm: 1500, roofOvhFrontMm: 300, roofOvhSidesMm: 200 },
};

const DESIGN_DIMS: Record<string, { externalWidthMm: number; externalDepthMm: number }> = {
  "alpha-small":    { externalWidthMm: 4000, externalDepthMm: 3000 },
  "alpha-medium":   { externalWidthMm: 4500, externalDepthMm: 3500 },
  "alpha-large":    { externalWidthMm: 5000, externalDepthMm: 4000 },
  "alpha-xlarge":   { externalWidthMm: 5500, externalDepthMm: 4500 },
  "beta-small":     { externalWidthMm: 4500, externalDepthMm: 3000 },
  "beta-medium":    { externalWidthMm: 5000, externalDepthMm: 3500 },
  "beta-large":     { externalWidthMm: 5500, externalDepthMm: 4000 },
  "beta-xlarge":    { externalWidthMm: 6000, externalDepthMm: 4500 },
  "charlie-small":  { externalWidthMm: 5000, externalDepthMm: 3000 },
  "charlie-medium": { externalWidthMm: 5500, externalDepthMm: 3500 },
  "charlie-large":  { externalWidthMm: 6000, externalDepthMm: 4000 },
  "charlie-xlarge": { externalWidthMm: 6500, externalDepthMm: 4500 },
};

const SIP_THICKNESSES: Record<string, { totalMm: number; weightKgPerM2: number; label: string }> = {
  "sip-97":  { totalMm: 97,  weightKgPerM2: 8.4,  label: "97mm  (OSB 22 + EPS 75)"  },
  "sip-119": { totalMm: 119, weightKgPerM2: 9.8,  label: "119mm (OSB 22 + EPS 97)"  },
  "sip-144": { totalMm: 144, weightKgPerM2: 11.3, label: "144mm (OSB 22 + EPS 122)" },
  "sip-169": { totalMm: 169, weightKgPerM2: 12.1, label: "169mm (OSB 22 + EPS 147)" },
  "sip-194": { totalMm: 194, weightKgPerM2: 12.8, label: "194mm (OSB 22 + EPS 172)" },
  "sip-219": { totalMm: 219, weightKgPerM2: 13.5, label: "219mm (OSB 22 + EPS 197)" },
  "sip-229": { totalMm: 229, weightKgPerM2: 14.6, label: "229mm (OSB 22 + EPS 207)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function bestStockLength(requiredMm: number): number {
  return STOCK_LENGTHS_MM.find(l => l >= requiredMm) ?? STOCK_LENGTHS_MM[STOCK_LENGTHS_MM.length - 1];
}

function round2(n: number) { return Math.round(n * 100) / 100; }

interface PanelCut {
  position:     number;
  cutWidthMm:   number;
  cutHeightMm:  number;
  stockWidthMm: number;
  stockLengthMm: number;
  wasteWidthMm: number;
  wasteHeightMm: number;
  netAreaM2:    number;
  grossAreaM2:  number;
  isRemnant:    boolean; // true = narrower cut from last panel
}

interface FaceSchedule {
  face:           string;
  widthMm:        number;
  heightMm:       number;
  stockLengthMm:  number;
  totalPanels:    number;
  fullPanels:     number;
  remnantPanels:  number;
  grossAreaM2:    number;
  openingAreaM2:  number;
  netAreaM2:      number;
  panels:         PanelCut[];
}

function layoutFace(face: string, widthMm: number, heightMm: number, openingAreaM2 = 0): FaceSchedule {
  const stockLengthMm = bestStockLength(heightMm);
  const fullCount   = Math.floor(widthMm / PANEL_WIDTH_MM);
  const remnantW    = widthMm % PANEL_WIDTH_MM;
  const totalPanels = fullCount + (remnantW > 0 ? 1 : 0);

  const panels: PanelCut[] = [];

  for (let i = 0; i < fullCount; i++) {
    panels.push({
      position:      i + 1,
      cutWidthMm:    PANEL_WIDTH_MM,
      cutHeightMm:   heightMm,
      stockWidthMm:  PANEL_WIDTH_MM,
      stockLengthMm,
      wasteWidthMm:  0,
      wasteHeightMm: stockLengthMm - heightMm,
      netAreaM2:     round2((PANEL_WIDTH_MM * heightMm) / 1e6),
      grossAreaM2:   round2((PANEL_WIDTH_MM * stockLengthMm) / 1e6),
      isRemnant:     false,
    });
  }

  if (remnantW > 0) {
    panels.push({
      position:      fullCount + 1,
      cutWidthMm:    remnantW,
      cutHeightMm:   heightMm,
      stockWidthMm:  PANEL_WIDTH_MM,
      stockLengthMm,
      wasteWidthMm:  PANEL_WIDTH_MM - remnantW,
      wasteHeightMm: stockLengthMm - heightMm,
      netAreaM2:     round2((remnantW * heightMm) / 1e6),
      grossAreaM2:   round2((PANEL_WIDTH_MM * stockLengthMm) / 1e6),
      isRemnant:     true,
    });
  }

  const grossAreaM2 = round2((widthMm * heightMm) / 1e6);
  const netAreaM2   = round2(Math.max(0, grossAreaM2 - openingAreaM2));

  return {
    face, widthMm, heightMm, stockLengthMm, totalPanels,
    fullPanels: fullCount,
    remnantPanels: remnantW > 0 ? 1 : 0,
    grossAreaM2, openingAreaM2, netAreaM2,
    panels,
  };
}

// For 2D floors/roofs laid as a grid: rows of panels along the face depth
function layoutSlab(face: string, widthMm: number, depthMm: number): FaceSchedule {
  // Panels run across width (1222mm wide) and along depth (stock length)
  const stockLengthMm  = bestStockLength(depthMm);
  const rowRemnant      = depthMm % stockLengthMm;
  const fullRows        = Math.floor(depthMm / stockLengthMm);
  // use full-length stock for full rows, one cut row if remainder > 0
  const colsPerRow      = Math.ceil(widthMm / PANEL_WIDTH_MM);
  const fullCols        = Math.floor(widthMm / PANEL_WIDTH_MM);
  const remnantW        = widthMm % PANEL_WIDTH_MM;

  const rowCount        = fullRows + (rowRemnant > 0 ? 1 : 0);
  const totalPanels     = colsPerRow * rowCount;

  const panels: PanelCut[] = [];
  let pos = 1;
  for (let r = 0; r < rowCount; r++) {
    const rowDepth    = r < fullRows ? stockLengthMm : rowRemnant;
    const rowStock    = bestStockLength(rowDepth);
    for (let c = 0; c < fullCols; c++) {
      panels.push({
        position:      pos++,
        cutWidthMm:    PANEL_WIDTH_MM,
        cutHeightMm:   rowDepth,
        stockWidthMm:  PANEL_WIDTH_MM,
        stockLengthMm: rowStock,
        wasteWidthMm:  0,
        wasteHeightMm: rowStock - rowDepth,
        netAreaM2:     round2((PANEL_WIDTH_MM * rowDepth) / 1e6),
        grossAreaM2:   round2((PANEL_WIDTH_MM * rowStock) / 1e6),
        isRemnant:     false,
      });
    }
    if (remnantW > 0) {
      panels.push({
        position:      pos++,
        cutWidthMm:    remnantW,
        cutHeightMm:   rowDepth,
        stockWidthMm:  PANEL_WIDTH_MM,
        stockLengthMm: rowStock,
        wasteWidthMm:  PANEL_WIDTH_MM - remnantW,
        wasteHeightMm: rowStock - rowDepth,
        netAreaM2:     round2((remnantW * rowDepth) / 1e6),
        grossAreaM2:   round2((PANEL_WIDTH_MM * rowStock) / 1e6),
        isRemnant:     true,
      });
    }
  }

  const grossAreaM2 = round2((widthMm * depthMm) / 1e6);
  return {
    face, widthMm, heightMm: depthMm, stockLengthMm,
    totalPanels, fullPanels: colsPerRow * fullRows,
    remnantPanels: totalPanels - colsPerRow * fullRows,
    grossAreaM2, openingAreaM2: 0, netAreaM2: grossAreaM2,
    panels,
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post("/sip-quantities", (req, res) => {
  try {
    const { designId, sizeId, sipThicknessId } = req.body ?? {};
    if (typeof designId !== "string" || typeof sizeId !== "string" || typeof sipThicknessId !== "string") {
      return res.status(400).json({ error: "designId, sizeId and sipThicknessId are required strings" });
    }
    const body = { designId, sizeId, sipThicknessId };
    const design = DESIGNS.find(d => d.id === body.designId);
    const size   = SIZES[body.sizeId];
    const sip    = SIP_THICKNESSES[body.sipThicknessId];
    const dims   = DESIGN_DIMS[`${body.designId}-${body.sizeId}`];

    if (!design || !size || !sip || !dims) {
      return res.status(400).json({ error: "Unknown design, size or SIP thickness" });
    }

    const { externalWidthMm: outerW, externalDepthMm: outerL } = dims;
    const { frontHeightMm: frontH, backHeightMm: backH, roofDropMm, deckingWidthMm: deckW,
            roofOvhFrontMm: ovhF, roofOvhSidesMm: ovhS } = size;
    const wallT  = sip.totalMm;

    // Inner depth between front and back wall faces
    const innerL = outerL - 2 * wallT;

    // Openings
    const openings = [
      { name: "Front door",     widthMm: 1000, heightMm: 2000, areaM2: design.doorAreaM2 },
      { name: "Front window",   widthMm: 1350, heightMm: 1400, areaM2: design.frontWindowM2 },
      ...(design.lhsWindowM2 > 0 ? [{ name: "LHS window", widthMm: 1350, heightMm: 1400, areaM2: design.lhsWindowM2 }] : []),
      ...(design.rhsWindowM2 > 0 ? [{ name: "RHS window", widthMm: 1350, heightMm: 1400, areaM2: design.rhsWindowM2 }] : []),
    ];
    const frontOpeningM2 = design.doorAreaM2 + design.frontWindowM2;
    const lhsOpeningM2   = design.lhsWindowM2;
    const rhsOpeningM2   = design.rhsWindowM2;

    // Roof slope length (along slope)
    const roofHorizSpan  = outerL + ovhF + ovhS;
    const roofSlopeMm    = Math.round(Math.sqrt(roofHorizSpan ** 2 + roofDropMm ** 2));
    const roofWidthMm    = outerW + 2 * ovhS;

    // ── Face schedules ──────────────────────────────────────────────────────
    const faces: FaceSchedule[] = [
      layoutFace("Front wall",  outerW, frontH, frontOpeningM2),
      layoutFace("Back wall",   outerW, backH),
      layoutFace("Left wall",   innerL, backH,  lhsOpeningM2),
      layoutFace("Right wall",  innerL, backH,  rhsOpeningM2),
      layoutSlab("Floor slab",  outerW, outerL),
      layoutSlab("Roof panel",  roofWidthMm, roofSlopeMm),
    ];

    // ── Totals ──────────────────────────────────────────────────────────────
    const totalPanels    = faces.reduce((s, f) => s + f.totalPanels, 0);
    const grossAreaM2    = round2(faces.reduce((s, f) => s + f.grossAreaM2, 0));
    const openingAreaM2  = round2(openings.reduce((s, o) => s + o.areaM2, 0));
    const netAreaM2      = round2(faces.reduce((s, f) => s + f.netAreaM2, 0));
    const weightKg       = round2(netAreaM2 * sip.weightKgPerM2);

    // ── Spline schedule ─────────────────────────────────────────────────────
    // Panel-to-panel vertical splines (one spline per joint between adjacent panels in each wall/roof)
    const wallJoints = faces.slice(0, 4).map(f => ({
      face:     f.face,
      joints:   Math.max(0, f.totalPanels - 1),
      lengthMm: f.heightMm,
      totalMm:  Math.max(0, f.totalPanels - 1) * f.heightMm,
    }));
    const roofJoints = {
      face:     "Roof panel",
      joints:   Math.max(0, faces[5].totalPanels - faces[5].fullPanels - 1),
      lengthMm: roofSlopeMm,
      totalMm:  Math.max(0, faces[5].totalPanels - faces[5].fullPanels - 1) * roofSlopeMm,
    };

    const panelJointTotalMm = wallJoints.reduce((s, j) => s + j.totalMm, 0) + roofJoints.totalMm;

    // Sole plate (bottom of each wall, 47mm × wallT)
    const solePlateMm   = 2 * outerW + 2 * innerL;
    // Head plate (top of each wall)
    const headPlateMm   = solePlateMm;
    // Corner connections (4 corners × backH)
    const cornerMm      = 4 * backH;

    const splines = {
      panelJoints:    { joints: wallJoints, roofJoints, totalLinearMm: panelJointTotalMm },
      solePlate:      { description: `47 × ${wallT}mm sole plate, bottom of all walls`, totalLinearMm: solePlateMm },
      headPlate:      { description: `47 × ${wallT}mm head plate, top of all walls`,    totalLinearMm: headPlateMm },
      cornerSplines:  { description: "Corner connections (4 corners)",                   totalLinearMm: cornerMm   },
    };

    return res.json({
      buildingRef: `${body.designId.charAt(0).toUpperCase() + body.designId.slice(1)} — ${size.name} (${outerW} × ${outerL}mm)`,
      sipSpec:     sip.label,
      wallThicknessMm: wallT,
      outerW, outerL, frontH, backH,
      openings,
      faces,
      splines,
      totals: { totalPanels, grossAreaM2, openingAreaM2, netAreaM2, weightKg },
    });

  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
