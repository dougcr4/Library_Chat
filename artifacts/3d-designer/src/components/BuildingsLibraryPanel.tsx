import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, ChevronDown, AlertTriangle, Layers } from "lucide-react";
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

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleFitoutSelect = (sectionId: string, optionId: string, productId: string, cribbCode: string | null) => {
    setFitoutSelections(prev => {
      const filtered = prev.filter(p => p.optionId !== optionId);
      return [...filtered, { sectionId, optionId, productId, cribbCode }];
    });
  };

  if (isLoading) {
    return (
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </ScrollArea>
    );
  }

  if (!catalogue) return <div className="p-6 text-sm text-muted-foreground">Failed to load catalogue.</div>;

  return (
    <ScrollArea className="flex-1 px-6 py-4">
      <div className="space-y-8 pb-10">
        
        {/* Step 1: Shell Design */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span> 
            Shell Design
          </h3>
          <div className="space-y-3">
            {catalogue.designs.map(design => (
              <Card 
                key={design.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedDesignId === design.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedDesignId(design.id === selectedDesignId ? null : design.id)}
              >
                <CardContent className="p-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {design.name} <span className="text-xs font-mono text-muted-foreground">{design.code}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{design.description}</p>
                  </div>
                  {selectedDesignId === design.id && <Check className="w-5 h-5 text-primary shrink-0" />}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Step 2: Size */}
        {selectedDesignId && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span> 
              Size
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {catalogue.sizes.map(size => {
                const hasFlags = size.planningFlag || size.buildingRegsFlag;
                return (
                  <Card 
                    key={size.id}
                    className={`cursor-pointer transition-all duration-200 ${selectedSizeId === size.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setSelectedSizeId(size.id === selectedSizeId ? null : size.id)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm flex items-center gap-2">
                          {size.label} ({size.name})
                          {hasFlags && (
                            <div className="flex gap-1">
                              {size.planningFlag && <Badge variant="secondary" className="px-1 text-[10px] h-4 bg-amber-500/20 text-amber-700 border-amber-500/30" title="Planning Permission Required">P</Badge>}
                              {size.buildingRegsFlag && <Badge variant="secondary" className="px-1 text-[10px] h-4 bg-red-500/20 text-red-700 border-red-500/30" title="Building Regulations Required">BR</Badge>}
                            </div>
                          )}
                        </span>
                        {(size.approxWidth && size.approxLength) ? (
                          <span className="text-xs text-muted-foreground">~{size.approxWidth} × {size.approxLength}mm</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Dimensions to be determined</span>
                        )}
                      </div>
                      {selectedSizeId === size.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: SIP Thickness */}
        {selectedSizeId && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span> 
              SIP Panel Thickness
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {catalogue.sipThicknesses.map(sip => (
                <Card 
                  key={sip.id}
                  className={`cursor-pointer transition-all duration-200 ${selectedSipThicknessId === sip.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}
                  onClick={() => setSelectedSipThicknessId(sip.id === selectedSipThicknessId ? null : sip.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm flex items-center gap-2">
                        {sip.label} <span className="text-xs text-muted-foreground font-normal">({sip.totalMm}mm total)</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sip.osbMm}mm OSB + {sip.epsMm}mm EPS
                      </span>
                    </div>
                    {selectedSipThicknessId === sip.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Fit-out Options */}
        {selectedSipThicknessId && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">4</span> 
              Fit-out Options
            </h3>
            <div className="space-y-3">
              {catalogue.fitoutSections.map(section => {
                const sectionSelections = fitoutSelections.filter(s => s.sectionId === section.id).length;
                return (
                  <Collapsible 
                    key={section.id} 
                    open={openSections[section.id]} 
                    onOpenChange={(isOpen) => setOpenSections(prev => ({ ...prev, [section.id]: isOpen }))}
                    className="border border-border rounded-xl bg-card overflow-hidden shadow-sm"
                  >
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{section.name}</span>
                        {sectionSelections > 0 && (
                          <Badge className="ml-2 h-5 bg-primary/10 text-primary hover:bg-primary/20">{sectionSelections}</Badge>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections[section.id] ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-4 pb-4 pt-1 space-y-4">
                      {section.options.map(option => {
                        const selectedForOption = fitoutSelections.find(s => s.optionId === option.id);
                        return (
                          <div key={option.id} className="space-y-2">
                            <h4 className="text-xs font-medium text-foreground">{option.name}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {option.products.map(product => {
                                const isProductSelected = selectedForOption?.productId === product.id;
                                return (
                                  <div key={product.id} className="flex flex-col gap-1">
                                    <button
                                      onClick={() => handleFitoutSelect(section.id, option.id, product.id, product.cribbCodes.length > 0 ? product.cribbCodes[0].code : null)}
                                      className={`text-left p-2 rounded-lg text-xs border transition-all ${isProductSelected ? 'bg-primary border-primary text-primary-foreground' : 'bg-background hover:bg-muted border-border'}`}
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
                                            className={`w-6 h-6 rounded border flex items-center justify-center text-[8px] font-mono transition-all ${selectedForOption.cribbCode === cc.code ? 'ring-2 ring-primary border-primary bg-primary/10 text-primary font-bold' : 'border-border text-muted-foreground hover:bg-muted'}`}
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
