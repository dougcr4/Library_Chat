import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Check } from "lucide-react";
import { useDesignerContext, useBuildingsCatalogue } from "@/hooks/useDesigner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect, useCallback } from "react";

// ── CribbNode type & helpers (recursive cascade) ────────────────────────────

type CribbNode = {
  index: number;
  label: string;
  code: string;
  children?: CribbNode[];
};

function isLeaf(cc: CribbNode): boolean {
  return !cc.children || cc.children.length === 0;
}

/** Returns the full path from root to the node with targetCode, or [] if not found */
function findPathToCode(nodes: CribbNode[], targetCode: string): CribbNode[] {
  for (const node of nodes) {
    if (node.code === targetCode) return [node];
    if (node.children && node.children.length > 0) {
      const sub = findPathToCode(node.children, targetCode);
      if (sub.length > 0) return [node, ...sub];
    }
  }
  return [];
}

// ── Cascading dropdown (used for Shell Design, Size, SIP) ───────────────────

function DropdownSelector({
  label,
  value,
  placeholder,
  options,
  onSelect,
  onClear,
  disabled,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  options: { id: string; label: string; sub?: string; extra?: React.ReactNode }[];
  onSelect: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.id === value);

  return (
    <div ref={ref} className={`relative transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
          selected
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border hover:border-primary/60 text-muted-foreground"
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-2 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          {value && (
            <button
              onClick={() => { onClear(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 border-b border-border italic"
            >
              Clear selection
            </button>
          )}
          <div className="max-h-52 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onSelect(opt.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-start justify-between gap-2 transition-colors ${
                  opt.id === value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span className="flex flex-col flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    {opt.label}
                    {opt.extra}
                  </span>
                  {opt.sub && <span className="text-[10px] text-muted-foreground font-normal leading-snug mt-0.5">{opt.sub}</span>}
                </span>
                {opt.id === value && <Check className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline product picker (no floating elements) ────────────────────────────

function FitoutOptionRow({
  option,
  sectionId,
  selectedProductId,
  selectedCribbCode,
  onSelect,
  onClear,
}: {
  option: { id: string; name: string; products: { id: string; name: string; cribbCodes: CribbNode[] }[] };
  sectionId: string;
  selectedProductId: string | null;
  selectedCribbCode: string | null;
  onSelect: (productId: string, cribbCode: string | null) => void;
  onClear: () => void;
}) {
  const selectedProduct = option.products.find(p => p.id === selectedProductId);

  // cascadePath = branch nodes selected above the current visible level
  const [cascadePath, setCascadePath] = useState<CribbNode[]>([]);

  // Reconstruct path whenever product or externally-stored code changes
  useEffect(() => {
    if (!selectedProduct || !selectedCribbCode) { setCascadePath([]); return; }
    const full = findPathToCode(selectedProduct.cribbCodes as CribbNode[], selectedCribbCode);
    setCascadePath(full.slice(0, -1)); // branches only — leaf is the stored code
  }, [selectedProduct?.id, selectedCribbCode]);

  // Nodes visible at the current cascade level
  const currentNodes: CribbNode[] =
    cascadePath.length === 0
      ? (selectedProduct?.cribbCodes ?? []) as CribbNode[]
      : (cascadePath[cascadePath.length - 1].children ?? []);

  const showCascade = !!selectedProduct && selectedProduct.cribbCodes.length > 0;

  const handleProductClick = (product: typeof option.products[0]) => {
    if (product.id === selectedProductId) { onClear(); setCascadePath([]); return; }
    setCascadePath([]);
    const nodes = product.cribbCodes as CribbNode[];
    // Auto-select only when there's exactly one leaf at root level — otherwise wait for cascade
    if (nodes.length === 1 && isLeaf(nodes[0])) {
      onSelect(product.id, nodes[0].code);
    } else {
      onSelect(product.id, null);
    }
  };

  const handleNodeClick = (cc: CribbNode) => {
    if (!isLeaf(cc)) {
      setCascadePath(prev => [...prev, cc]); // go deeper
    } else {
      onSelect(selectedProduct!.id, cc.code); // final pick
    }
  };

  const goBackTo = (idx: number) => setCascadePath(prev => prev.slice(0, idx));

  // The leaf that's currently the stored selection
  const selectedLeaf = selectedProduct && selectedCribbCode
    ? findPathToCode(selectedProduct.cribbCodes as CribbNode[], selectedCribbCode).at(-1) ?? null
    : null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{option.name}</p>

      {/* ── Product buttons ── */}
      <div className="flex flex-wrap gap-1.5">
        {option.products.map(product => {
          const isSelected = product.id === selectedProductId;
          return (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all leading-tight ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background border-border hover:border-primary/50 hover:bg-primary/5 text-foreground"
              }`}
            >
              {product.name}
            </button>
          );
        })}
      </div>

      {/* ── Cascade tier ── */}
      {showCascade && (
        <div className="pl-1 space-y-1 animate-in fade-in duration-150">
          {/* Breadcrumb trail */}
          {(cascadePath.length > 0 || selectedLeaf) && (
            <div className="flex flex-wrap items-center gap-0.5 text-[9px] text-muted-foreground mb-0.5">
              <button onClick={() => goBackTo(0)} className="hover:text-foreground hover:underline">
                {selectedProduct!.name}
              </button>
              {cascadePath.map((cc, i) => (
                <span key={cc.code} className="flex items-center gap-0.5">
                  <span className="opacity-50">›</span>
                  <button onClick={() => goBackTo(i + 1)} className="hover:text-foreground hover:underline">
                    {cc.label}
                  </button>
                </span>
              ))}
              {selectedLeaf && cascadePath.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <span className="opacity-50">›</span>
                  <span className="text-primary font-semibold">{selectedLeaf.label}</span>
                </span>
              )}
            </div>
          )}

          {/* Current level option buttons */}
          {currentNodes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentNodes.map(cc => {
                const isInPath = cascadePath.some(p => p.code === cc.code);
                const isChosen = selectedCribbCode === cc.code;
                return (
                  <button
                    key={cc.code}
                    title={cc.code}
                    onClick={() => handleNodeClick(cc)}
                    className={`px-2.5 py-1 rounded text-[10px] border transition-all font-medium ${
                      isChosen || isInPath
                        ? "bg-primary/20 border-primary text-primary font-bold ring-1 ring-primary"
                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {cc.label}{!isLeaf(cc) ? " ›" : ""}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export default function BuildingsLibraryPanel() {
  const {
    selectedDesignId, setSelectedDesignId,
    selectedSizeId, setSelectedSizeId,
    fitoutSelections, setFitoutSelections,
  } = useDesignerContext();

  const { data: catalogue, isLoading } = useBuildingsCatalogue();

  // Pre-initialise all sections as closed (avoids controlled/uncontrolled warning)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(["exterior", "interior", "finishes", "utilities"].map(id => [id, false]))
  );

  const handleFitoutSelect = useCallback((sectionId: string, optionId: string, productId: string, cribbCode: string | null) => {
    setFitoutSelections(prev => {
      const filtered = prev.filter(p => p.optionId !== optionId);
      return [...filtered, { sectionId, optionId, productId, cribbCode }];
    });
  }, [setFitoutSelections]);

  const handleFitoutClear = useCallback((optionId: string) => {
    setFitoutSelections(prev => prev.filter(p => p.optionId !== optionId));
  }, [setFitoutSelections]);

  if (isLoading) {
    return (
      <div className="flex-1 px-4 py-4 space-y-4">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    );
  }

  if (!catalogue) return <div className="p-4 text-xs text-muted-foreground">Failed to load catalogue.</div>;

  const selectedDesign = catalogue.designs.find(d => d.id === selectedDesignId);
  const selectedSize = catalogue.sizes.find(s => s.id === selectedSizeId);

  const designOptions = catalogue.designs.map(d => ({
    id: d.id,
    label: d.name,
    sub: d.description,
  }));

  const sizeOptions = catalogue.sizes.map(s => ({
    id: s.id,
    label: `${s.label} — ${s.name}`,
    sub: [
      s.approxWidth && s.approxLength ? `${(s.approxWidth / 1000).toFixed(1)}×${(s.approxLength / 1000).toFixed(1)}m` : null,
      s.footprintM2 != null ? `${s.footprintM2}m²` : null,
      s.note,
    ].filter(Boolean).join("  ·  "),
    extra: (
      <span className="flex gap-1 shrink-0">
        {s.planningFlag && <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-amber-100 text-amber-700" title="Planning Permission Required">P</span>}
        {s.buildingRegsFlag && <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-red-100 text-red-700" title="Building Regulations Required">BR</span>}
      </span>
    ),
  }));

  const handleDesignChange = (id: string) => {
    setSelectedDesignId(id);
    setSelectedSizeId(null);
    setFitoutSelections([]);
  };

  const handleSizeChange = (id: string) => {
    setSelectedSizeId(id);
    setFitoutSelections([]);
  };

  return (
    <ScrollArea className="flex-1 px-4 py-4">
      <div className="space-y-4 pb-4">

        {/* Step 1: Shell Design */}
        <DropdownSelector
          label="1. Shell Design"
          value={selectedDesignId}
          placeholder="Select a shell design…"
          options={designOptions}
          onSelect={handleDesignChange}
          onClear={() => { setSelectedDesignId(null); setSelectedSizeId(null); setFitoutSelections([]); }}
        />

        {/* Step 2: Size */}
        <div className={selectedDesignId ? "animate-in fade-in slide-in-from-top-2 duration-200" : ""}>
          <DropdownSelector
            label="2. Size"
            value={selectedSizeId}
            placeholder="Select a size…"
            options={sizeOptions}
            onSelect={handleSizeChange}
            onClear={() => { setSelectedSizeId(null); setFitoutSelections([]); }}
            disabled={!selectedDesignId}
          />
        </div>

        {/* Design summary headline — appears once shell + size are chosen */}
        {selectedDesign && selectedSize && (
          <div className="animate-in fade-in duration-300 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2">
            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider mb-0.5">Selected Design</p>
            <p className="text-sm font-bold text-primary leading-tight">
              {selectedDesign.name} · {selectedSize.label} — {selectedSize.name}
            </p>
            {selectedSize.approxWidth && selectedSize.approxLength && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {(selectedSize.approxWidth / 1000).toFixed(1)}×{(selectedSize.approxLength / 1000).toFixed(1)}m
                {selectedSize.footprintM2 != null ? `  ·  ${selectedSize.footprintM2}m²` : ""}
              </p>
            )}
          </div>
        )}

        {/* Step 3: Fit-out sections — inline buttons, no floating dropdowns */}
        {selectedSizeId && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">3. Fit-out Options</p>

            {catalogue.fitoutSections.map(section => {
              const sectionCount = fitoutSelections.filter(s => s.sectionId === section.id).length;
              const isOpen = openSections[section.id] ?? false;

              return (
                <Collapsible
                  key={section.id}
                  open={isOpen}
                  onOpenChange={(open) => setOpenSections(prev =>
                    open
                      ? Object.fromEntries(Object.keys(prev).map(k => [k, k === section.id]))
                      : { ...prev, [section.id]: false }
                  )}
                  className="border border-border rounded-lg bg-card"
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors rounded-lg">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{section.name}</span>
                      {sectionCount > 0 && (
                        <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0 font-semibold leading-5">{sectionCount}</span>
                      )}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 space-y-4 border-t border-border">
                      {section.options.map(option => {
                        const sel = fitoutSelections.find(s => s.optionId === option.id);
                        return (
                          <FitoutOptionRow
                            key={option.id}
                            option={option}
                            sectionId={section.id}
                            selectedProductId={sel?.productId ?? null}
                            selectedCribbCode={sel?.cribbCode ?? null}
                            onSelect={(productId, cribbCode) => handleFitoutSelect(section.id, option.id, productId, cribbCode)}
                            onClear={() => handleFitoutClear(option.id)}
                          />
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
