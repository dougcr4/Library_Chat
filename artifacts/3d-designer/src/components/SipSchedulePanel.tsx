import { useState } from "react";
import { useSipQuantities, useDesignerContext } from "@/hooks/useDesigner";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutGrid, ListOrdered, Link2, DoorOpen } from "lucide-react";

function mm(n: number) { return `${n.toLocaleString()}mm`; }
function m(n: number)  { return `${(n / 1000).toFixed(2)}m`; }
function m2(n: number) { return `${n.toFixed(2)} m²`; }
function kg(n: number) { return `${n.toFixed(0)} kg`; }

type Tab = "summary" | "cutting" | "splines" | "openings";

export default function SipSchedulePanel() {
  const { selectedDesignId, selectedSizeId, selectedSipThicknessId } = useDesignerContext();
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [expandedFace, setExpandedFace] = useState<string | null>(null);

  const { data, isLoading, error } = useSipQuantities(
    selectedDesignId, selectedSizeId, selectedSipThicknessId
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "summary",  label: "Summary",    icon: <LayoutGrid  className="w-3.5 h-3.5" /> },
    { id: "cutting",  label: "Cutting List", icon: <ListOrdered className="w-3.5 h-3.5" /> },
    { id: "splines",  label: "Splines",    icon: <Link2       className="w-3.5 h-3.5" /> },
    { id: "openings", label: "Openings",   icon: <DoorOpen    className="w-3.5 h-3.5" /> },
  ];

  if (!selectedDesignId || !selectedSizeId || !selectedSipThicknessId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm px-6 text-center">
        Select a design, size and SIP thickness to see the panel schedule.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Calculating…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full text-destructive text-sm px-6 text-center">
        {error?.message ?? "Failed to load SIP schedule."}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none px-4 pt-4 pb-2 border-b border-border space-y-1">
        <p className="text-sm font-semibold text-foreground leading-tight">{data.buildingRef}</p>
        <p className="text-xs text-muted-foreground">{data.sipSpec}</p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="outline" className="text-xs">{data.totals.totalPanels} panels</Badge>
          <Badge variant="outline" className="text-xs">{m2(data.totals.netAreaM2)} net</Badge>
          <Badge variant="outline" className="text-xs">{kg(data.totals.weightKg)} est.</Badge>
        </div>
      </div>

      <div className="flex-none flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors
              ${activeTab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {activeTab === "summary" && (
          <div className="p-3 space-y-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-2 py-1.5 font-semibold">Face</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Panels</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Net m²</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Gross m²</th>
                </tr>
              </thead>
              <tbody>
                {data.faces.map(f => (
                  <tr key={f.face} className="border-t border-border/50 hover:bg-muted/30">
                    <td className="px-2 py-1.5 font-medium">{f.face}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{f.totalPanels}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{f.netAreaM2.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{f.grossAreaM2.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-2 py-1.5">Total</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{data.totals.totalPanels}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{data.totals.netAreaM2.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{data.totals.grossAreaM2.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1 text-xs">
              <p className="font-semibold text-foreground mb-1.5">Building dimensions</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                <span>Outer width</span>     <span className="text-right tabular-nums text-foreground">{mm(data.outerW)}</span>
                <span>Outer depth</span>     <span className="text-right tabular-nums text-foreground">{mm(data.outerL)}</span>
                <span>Front wall height</span><span className="text-right tabular-nums text-foreground">{mm(data.frontH)}</span>
                <span>Back wall height</span><span className="text-right tabular-nums text-foreground">{mm(data.backH)}</span>
                <span>Wall thickness</span>  <span className="text-right tabular-nums text-foreground">{mm(data.wallThicknessMm)}</span>
                <span>Est. panel weight</span><span className="text-right tabular-nums text-foreground">{kg(data.totals.weightKg)}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cutting" && (
          <div className="p-2 space-y-2">
            {data.faces.map(f => (
              <div key={f.face} className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-xs font-semibold"
                  onClick={() => setExpandedFace(expandedFace === f.face ? null : f.face)}
                >
                  <span>{f.face}</span>
                  <div className="flex items-center gap-2 text-muted-foreground font-normal">
                    <span>{f.totalPanels} panels</span>
                    <span>{mm(f.widthMm)} × {mm(f.heightMm)}</span>
                    <span className="text-foreground">{expandedFace === f.face ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expandedFace === f.face && (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/20 border-t border-border/50">
                        <th className="text-center px-2 py-1 font-semibold w-8">#</th>
                        <th className="text-right px-2 py-1 font-semibold">Cut W</th>
                        <th className="text-right px-2 py-1 font-semibold">Cut H</th>
                        <th className="text-right px-2 py-1 font-semibold">Stock</th>
                        <th className="text-right px-2 py-1 font-semibold">Waste W</th>
                        <th className="text-right px-2 py-1 font-semibold">Waste H</th>
                        <th className="text-right px-2 py-1 font-semibold">m²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.panels.map(p => (
                        <tr
                          key={p.position}
                          className={`border-t border-border/30 hover:bg-muted/20 ${p.isRemnant ? "text-amber-700 dark:text-amber-400" : ""}`}
                        >
                          <td className="px-2 py-1 text-center text-muted-foreground">{p.position}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{p.cutWidthMm}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{p.cutHeightMm}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{p.stockWidthMm}×{p.stockLengthMm}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{p.wasteWidthMm > 0 ? p.wasteWidthMm : "—"}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{p.wasteHeightMm > 0 ? p.wasteHeightMm : "—"}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{p.netAreaM2.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border font-semibold bg-muted/30 text-xs">
                        <td colSpan={5} className="px-2 py-1 text-muted-foreground">
                          {f.openingAreaM2 > 0 && `Deduct openings: −${m2(f.openingAreaM2)}`}
                        </td>
                        <td className="px-2 py-1 text-right">Net</td>
                        <td className="px-2 py-1 text-right tabular-nums">{f.netAreaM2.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground px-1 pb-2">
              All dimensions in mm. Amber = cut remnant panel. Stock sizes: 1222×2440 or 1222×3050mm.
            </p>
          </div>
        )}

        {activeTab === "splines" && (
          <div className="p-3 space-y-3 text-xs">
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 font-semibold">Panel-to-panel joints</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/20 border-t border-border/50">
                    <th className="text-left px-3 py-1.5 font-semibold">Face</th>
                    <th className="text-right px-3 py-1.5 font-semibold">Joints</th>
                    <th className="text-right px-3 py-1.5 font-semibold">Each</th>
                    <th className="text-right px-3 py-1.5 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.splines.panelJoints.joints.map(j => (
                    <tr key={j.face} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-1.5">{j.face}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{j.joints}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{mm(j.lengthMm)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{m(j.totalMm)}</td>
                    </tr>
                  ))}
                  {data.splines.panelJoints.roofJoints.joints > 0 && (
                    <tr className="border-t border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-1.5">{data.splines.panelJoints.roofJoints.face}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{data.splines.panelJoints.roofJoints.joints}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{mm(data.splines.panelJoints.roofJoints.lengthMm)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{m(data.splines.panelJoints.roofJoints.totalMm)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    <td colSpan={3} className="px-3 py-1.5">Total panel splines</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{m(data.splines.panelJoints.totalLinearMm)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 font-semibold">Plates &amp; corner connections</div>
              <table className="w-full border-collapse">
                <tbody>
                  {[
                    { label: "Sole plate",      spec: data.splines.solePlate },
                    { label: "Head plate",      spec: data.splines.headPlate },
                    { label: "Corner splines",  spec: data.splines.cornerSplines },
                  ].map(row => (
                    <tr key={row.label} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-1.5 font-medium">{row.label}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.spec.description}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{m(row.spec.totalLinearMm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground px-1 pb-1">
              Spline quantities are linear metres. One spline per panel joint; specify SIP or timber spline type on order.
            </p>
          </div>
        )}

        {activeTab === "openings" && (
          <div className="p-3 space-y-3 text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-2 py-1.5 font-semibold">Opening</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Width</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Height</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Area</th>
                </tr>
              </thead>
              <tbody>
                {data.openings.map(o => (
                  <tr key={o.name} className="border-t border-border/50 hover:bg-muted/30">
                    <td className="px-2 py-1.5 font-medium">{o.name}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{mm(o.widthMm)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{mm(o.heightMm)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{m2(o.areaM2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td colSpan={3} className="px-2 py-1.5">Total opening area</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m2(data.totals.openingAreaM2)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs text-muted-foreground px-1 pb-1">
              Standard door: 1000×2000mm. Standard window: 1350×1400mm. Opening area is deducted from net panel area.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
