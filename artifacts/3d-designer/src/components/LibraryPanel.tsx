import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Settings as SettingsIcon, Box, Home, Check } from "lucide-react";
import { useDesignerContext, useStyles, useItems, useProjects, useBuildingsCatalogue } from "@/hooks/useDesigner";
import { useState, useRef, useEffect } from "react";
import SettingsDialog from "./SettingsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import BuildingsLibraryPanel from "./BuildingsLibraryPanel";

function DropdownSelector({
  label,
  value,
  placeholder,
  options,
  onSelect,
  onClear,
  renderOption,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  options: { id: string; label: string; sub?: string }[];
  onSelect: (id: string) => void;
  onClear: () => void;
  renderOption?: (opt: { id: string; label: string; sub?: string }) => React.ReactNode;
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
    <div ref={ref} className="relative">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
          selected
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border hover:border-primary/60 text-muted-foreground"
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-2 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
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
                  <span className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.sub && <span className="text-[10px] text-muted-foreground font-normal">{opt.sub}</span>}
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

export default function LibraryPanel() {
  const {
    mode, setMode,
    selectedStyleId, setSelectedStyleId,
    selectedItemId, setSelectedItemId,
    selectedDesignId, selectedSizeId, selectedSipThicknessId,
    setCurrentPrompt,
  } = useDesignerContext();

  const { data: stylesData, isLoading: stylesLoading } = useStyles();
  const { data: itemsData, isLoading: itemsLoading } = useItems();
  const { data: projectsData } = useProjects();
  const { data: catalogueData } = useBuildingsCatalogue();

  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const selectedStyle = stylesData?.styles.find(s => s.id === selectedStyleId);
  const selectedItem = itemsData?.items.find(i => i.id === selectedItemId);
  const selectedDesign = catalogueData?.designs.find(d => d.id === selectedDesignId);
  const selectedSize = catalogueData?.sizes.find(s => s.id === selectedSizeId);
  const selectedSipThickness = catalogueData?.sipThicknesses.find(s => s.id === selectedSipThicknessId);

  const styleOptions = stylesData?.styles.map(s => ({ id: s.id, label: s.name, sub: s.description })) ?? [];
  const itemOptions = itemsData?.items.map(i => ({ id: i.id, label: i.name, sub: i.category })) ?? [];

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
            {mode === "furniture" ? <Box className="w-4 h-4" /> : <Home className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight leading-tight">3D Designer</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {mode === "furniture" ? "Garden Furniture" : "Garden Buildings"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg">
          <button
            onClick={() => setMode("furniture")}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${mode === "furniture" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            🌿 Furniture
          </button>
          <button
            onClick={() => setMode("building")}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${mode === "building" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            🏗 Buildings
          </button>
        </div>
      </div>

      {/* Library Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {mode === "furniture" ? (
          <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
            {stylesLoading || itemsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ) : (
              <>
                <DropdownSelector
                  label="Style"
                  value={selectedStyleId}
                  placeholder="Select a style…"
                  options={styleOptions}
                  onSelect={setSelectedStyleId}
                  onClear={() => setSelectedStyleId(null)}
                />

                <DropdownSelector
                  label="Item"
                  value={selectedItemId}
                  placeholder="Select an item…"
                  options={itemOptions}
                  onSelect={setSelectedItemId}
                  onClear={() => setSelectedItemId(null)}
                />
              </>
            )}
          </div>
        ) : (
          <BuildingsLibraryPanel />
        )}
      </div>

      {/* Bottom Panel */}
      <div className="border-t border-border bg-sidebar flex flex-col shrink-0">

        {/* Current Selection */}
        <div className="px-4 py-2 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Selection</p>
          {mode === "furniture" ? (
            selectedStyle || selectedItem ? (
              <div className="flex flex-wrap gap-1">
                {selectedStyle && <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-primary hover:bg-primary">{selectedStyle.name}</Badge>}
                {selectedItem && <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary text-primary">{selectedItem.name}</Badge>}
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">Nothing selected</p>
            )
          ) : (
            selectedDesign || selectedSize || selectedSipThickness ? (
              <div className="flex flex-wrap gap-1">
                {selectedDesign && <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-primary hover:bg-primary">{selectedDesign.name}</Badge>}
                {selectedSize && <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary text-primary">{selectedSize.label}</Badge>}
                {selectedSipThickness && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{selectedSipThickness.label}</Badge>}
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">Nothing selected</p>
            )
          )}
        </div>

        {/* Recent Projects */}
        <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors">
            Recent Projects
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isProjectsOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="max-h-36 px-4 pb-2">
              <div className="space-y-1 pt-1">
                {!projectsData?.projects?.length && (
                  <p className="text-xs text-center text-muted-foreground py-2">No projects yet</p>
                )}
                {projectsData?.projects?.map(project => {
                  let dot = "bg-muted-foreground";
                  if (project.status === "processing") dot = "bg-blue-500";
                  if (project.status === "rendering") dot = "bg-amber-500";
                  if (project.status === "complete") dot = "bg-green-500";
                  if (project.status === "error") dot = "bg-red-500";
                  return (
                    <button
                      key={project.id}
                      onClick={() => setCurrentPrompt(project.prompt)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted/60 transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(project.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>

        {/* Footer */}
        <div className="px-4 py-2 flex justify-between items-center border-t border-border">
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <span className="text-[10px] text-muted-foreground">v1.0.0</span>
        </div>
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
