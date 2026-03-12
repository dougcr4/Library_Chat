import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { useDesignerContext, useBuildingsCatalogue } from "@/hooks/useDesigner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function BuildingsLibraryPanel() {
  const { 
    selectedDesignId, setSelectedDesignId,
    selectedSizeId, setSelectedSizeId,
    selectedSipThicknessId, setSelectedSipThicknessId,
    fitoutSelections, setFitoutSelections
  } = useDesignerContext();
  
  const { data: catalogue, isLoading } = useBuildingsCatalogue();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const handleFitoutSelect = (sectionId: string, optionId: string, productId: string, cribbCode: string | null) => {
    setFitoutSelections(prev => {
      const filtered = prev.filter(p => p.optionId !== optionId);
      return [...filtered, { sectionId, optionId, productId, cribbCode }];
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 px-4 py-3 space-y-3">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    );
  }

  if (!catalogue) return <div className="p-4 text-xs text-muted-foreground">Failed to load catalogue.</div>;

  const stepLabel = (n: number, label: string) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{n}</span>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <ScrollArea className="flex-1 px-4 py-3">
      <div className="space-y-5 pb-4">

        {/* Step 1: Shell Design */}
        <div>
          {stepLabel(1, "Shell Design")}
          <div className="grid grid-cols-3 gap-1.5">
            {catalogue.designs.map(design => (
              <button
                key={design.id}
                title={design.description}
                onClick={() => setSelectedDesignId(design.id === selectedDesignId ? null : design.id)}
                className={`px-2 py-2 rounded-lg text-xs font-medium text-center transition-all border leading-tight ${
                  selectedDesignId === design.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border hover:border-primary/60 hover:bg-primary/5 text-foreground'
                }`}
              >
                <div className="font-semibold">{design.name}</div>
                <div className={`text-[9px] mt-0.5 ${selectedDesignId === design.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{design.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Size */}
        {selectedDesignId && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {stepLabel(2, "Size")}
            <div className="grid grid-cols-1 gap-1.5">
              {catalogue.sizes.map(size => {
                const isSelected = selectedSizeId === size.id;
                return (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSizeId(size.id === selectedSizeId ? null : size.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border hover:border-primary/60 hover:bg-primary/5 text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold">{size.label}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {size.name}
                        {(size.approxWidth && size.approxLength) ? ` · ${size.approxWidth}×${size.approxLength}mm` : ''}
                      </span>
                    </span>
                    <span className="flex gap-1 shrink-0">
                      {size.planningFlag && (
                        <span title="Planning Permission Required" className={`text-[9px] px-1 py-0.5 rounded font-bold ${isSelected ? 'bg-amber-400/40 text-amber-100' : 'bg-amber-100 text-amber-700'}`}>P</span>
                      )}
                      {size.buildingRegsFlag && (
                        <span title="Building Regulations Required" className={`text-[9px] px-1 py-0.5 rounded font-bold ${isSelected ? 'bg-red-400/40 text-red-100' : 'bg-red-100 text-red-700'}`}>BR</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: SIP Thickness */}
        {selectedSizeId && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {stepLabel(3, "SIP Panel Thickness")}
            <div className="grid grid-cols-1 gap-1.5">
              {catalogue.sipThicknesses.map(sip => {
                const isSelected = selectedSipThicknessId === sip.id;
                return (
                  <button
                    key={sip.id}
                    onClick={() => setSelectedSipThicknessId(sip.id === selectedSipThicknessId ? null : sip.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border hover:border-primary/60 hover:bg-primary/5 text-foreground'
                    }`}
                  >
                    <span className="font-semibold">{sip.label}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {sip.osbMm}mm OSB + {sip.epsMm}mm EPS
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Fit-out Options */}
        {selectedSipThicknessId && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {stepLabel(4, "Fit-out Options")}
            <div className="space-y-2">
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
                          <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0 font-semibold">{sectionCount}</span>
                        )}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
                      {section.options.map(option => {
                        const selectedForOption = fitoutSelections.find(s => s.optionId === option.id);
                        return (
                          <div key={option.id}>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1.5">{option.name}</p>
                            <div className="grid grid-cols-2 gap-1">
                              {option.products.map(product => {
                                const isProductSelected = selectedForOption?.productId === product.id;
                                return (
                                  <div key={product.id}>
                                    <button
                                      onClick={() => handleFitoutSelect(section.id, option.id, product.id, product.cribbCodes.length > 0 ? product.cribbCodes[0].code : null)}
                                      className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] border transition-all leading-tight ${
                                        isProductSelected
                                          ? 'bg-primary border-primary text-primary-foreground'
                                          : 'bg-background hover:bg-muted border-border text-foreground'
                                      }`}
                                    >
                                      {product.name}
                                    </button>
                                    {isProductSelected && product.cribbCodes.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1 pl-1">
                                        {product.cribbCodes.map(cc => (
                                          <button
                                            key={cc.code}
                                            title={cc.label}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleFitoutSelect(section.id, option.id, product.id, cc.code);
                                            }}
                                            className={`w-5 h-5 rounded border flex items-center justify-center text-[8px] font-mono transition-all ${
                                              selectedForOption.cribbCode === cc.code
                                                ? 'ring-2 ring-primary border-primary bg-primary/10 text-primary font-bold'
                                                : 'border-border text-muted-foreground hover:bg-muted'
                                            }`}
                                          >
                                            {cc.code}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
