import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Check } from "lucide-react";
import { useDesignerContext, useBuildingsCatalogue } from "@/hooks/useDesigner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect, useCallback } from "react";

function DropdownSelector({
  label,
  value,
  placeholder,
  options,
  onSelect,
  onClear,
  disabled,
  renderOption,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  options: { id: string; label: string; sub?: string; extra?: React.ReactNode }[];
  onSelect: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
  renderOption?: (opt: { id: string; label: string; sub?: string; extra?: React.ReactNode }) => React.ReactNode;
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
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
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                  opt.id === value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                {renderOption ? renderOption(opt) : (
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      {opt.label}
                      {opt.extra}
                    </span>
                    {opt.sub && <span className="text-[10px] text-muted-foreground font-normal truncate">{opt.sub}</span>}
                  </span>
                )}
                {opt.id === value && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuildingsLibraryPanel() {
  const {
    selectedDesignId, setSelectedDesignId,
    selectedSizeId, setSelectedSizeId,
    selectedSipThicknessId, setSelectedSipThicknessId,
    fitoutSelections, setFitoutSelections,
  } = useDesignerContext();

  const { data: catalogue, isLoading } = useBuildingsCatalogue();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const handleFitoutSelect = useCallback((sectionId: string, optionId: string, productId: string, cribbCode: string | null) => {
    setFitoutSelections(prev => {
      const filtered = prev.filter(p => p.optionId !== optionId);
      return [...filtered, { sectionId, optionId, productId, cribbCode }];
    });
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

  const designOptions = catalogue.designs.map(d => ({
    id: d.id,
    label: d.name,
    sub: d.description,
  }));

  const sizeOptions = catalogue.sizes.map(s => ({
    id: s.id,
    label: s.label,
    sub: `${s.name}${s.approxWidth && s.approxLength ? ` · ${s.approxWidth}×${s.approxLength}mm` : ""}`,
    extra: (
      <span className="flex gap-1">
        {s.planningFlag && (
          <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-amber-100 text-amber-700" title="Planning Permission Required">P</span>
        )}
        {s.buildingRegsFlag && (
          <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-red-100 text-red-700" title="Building Regulations Required">BR</span>
        )}
      </span>
    ),
  }));

  const sipOptions = catalogue.sipThicknesses.map(s => ({
    id: s.id,
    label: s.label,
    sub: `${s.osbMm}mm OSB + ${s.epsMm}mm EPS  ·  ${s.weightKg}kg/m²  ·  U=${s.uValue}`,
  }));

  const handleDesignChange = (id: string) => {
    setSelectedDesignId(id);
    setSelectedSizeId(null);
    setSelectedSipThicknessId(null);
    setFitoutSelections([]);
  };

  const handleSizeChange = (id: string) => {
    setSelectedSizeId(id);
    setSelectedSipThicknessId(null);
    setFitoutSelections([]);
  };

  const handleSipChange = (id: string) => {
    setSelectedSipThicknessId(id);
    setFitoutSelections([]);
  };

  return (
    <ScrollArea className="flex-1 px-4 py-4">
      <div className="space-y-4 pb-4">

        {/* Shell Design */}
        <DropdownSelector
          label="1. Shell Design"
          value={selectedDesignId}
          placeholder="Select a shell design…"
          options={designOptions}
          onSelect={handleDesignChange}
          onClear={() => { setSelectedDesignId(null); setSelectedSizeId(null); setSelectedSipThicknessId(null); setFitoutSelections([]); }}
        />

        {/* Size — cascades after design */}
        <div className={`transition-all duration-200 ${selectedDesignId ? "animate-in fade-in slide-in-from-top-2" : ""}`}>
          <DropdownSelector
            label="2. Size"
            value={selectedSizeId}
            placeholder="Select a size…"
            options={sizeOptions}
            onSelect={handleSizeChange}
            onClear={() => { setSelectedSizeId(null); setSelectedSipThicknessId(null); setFitoutSelections([]); }}
            disabled={!selectedDesignId}
          />
        </div>

        {/* SIP Thickness — cascades after size */}
        <div className={`transition-all duration-200 ${selectedSizeId ? "animate-in fade-in slide-in-from-top-2" : ""}`}>
          <DropdownSelector
            label="3. SIP Panel Thickness"
            value={selectedSipThicknessId}
            placeholder="Select panel thickness…"
            options={sipOptions}
            onSelect={handleSipChange}
            onClear={() => { setSelectedSipThicknessId(null); setFitoutSelections([]); }}
            disabled={!selectedSizeId}
          />
        </div>

        {/* Fit-out Sections — cascades after SIP */}
        {selectedSipThicknessId && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">4. Fit-out Options</p>

            {catalogue.fitoutSections.map(section => {
              const sectionCount = fitoutSelections.filter(s => s.sectionId === section.id).length;
              const isOpen = openSections[section.id];

              return (
                <Collapsible
                  key={section.id}
                  open={isOpen}
                  onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [section.id]: open }))}
                  className="border border-border rounded-lg overflow-hidden bg-card"
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{section.name}</span>
                      {sectionCount > 0 && (
                        <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 font-semibold">{sectionCount}</span>
                      )}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
                    {section.options.map(option => {
                      const selectedForOption = fitoutSelections.find(s => s.optionId === option.id);
                      const productOptions = option.products.map(p => ({
                        id: p.id,
                        label: p.name,
                        _cribbCodes: p.cribbCodes,
                      }));

                      return (
                        <div key={option.id}>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">{option.name}</p>
                          <div className="relative">
                            <FitoutDropdown
                              optionId={option.id}
                              products={option.products}
                              selectedProductId={selectedForOption?.productId ?? null}
                              selectedCribbCode={selectedForOption?.cribbCode ?? null}
                              onSelect={(productId, cribbCode) =>
                                handleFitoutSelect(section.id, option.id, productId, cribbCode)
                              }
                              onClear={() =>
                                setFitoutSelections(prev => prev.filter(s => s.optionId !== option.id))
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
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

function FitoutDropdown({
  optionId,
  products,
  selectedProductId,
  selectedCribbCode,
  onSelect,
  onClear,
}: {
  optionId: string;
  products: { id: string; name: string; cribbCodes: { code: string; label: string }[] }[];
  selectedProductId: string | null;
  selectedCribbCode: string | null;
  onSelect: (productId: string, cribbCode: string | null) => void;
  onClear: () => void;
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

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
          selectedProduct
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border hover:border-primary/60 text-muted-foreground"
        }`}
      >
        <span className="truncate text-sm">{selectedProduct ? selectedProduct.name : "Select…"}</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-2 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {selectedProductId && (
            <button
              onClick={() => { onClear(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 border-b border-border italic"
            >
              Clear selection
            </button>
          )}
          <div className="max-h-48 overflow-y-auto">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p.id, p.cribbCodes.length > 0 ? p.cribbCodes[0].code : null);
                  if (p.cribbCodes.length === 0) setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                  p.id === selectedProductId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                {p.name}
                {p.id === selectedProductId && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
          {/* Colour/variant swatches for selected product */}
          {selectedProductId && products.find(p => p.id === selectedProductId)?.cribbCodes.length ? (
            <div className="border-t border-border px-3 py-2 bg-muted/30">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Variant / Colour</p>
              <div className="flex flex-wrap gap-1">
                {products.find(p => p.id === selectedProductId)!.cribbCodes.map(cc => (
                  <button
                    key={cc.code}
                    title={cc.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(selectedProductId, cc.code);
                      setOpen(false);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                      selectedCribbCode === cc.code
                        ? "ring-2 ring-primary border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {cc.code}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
