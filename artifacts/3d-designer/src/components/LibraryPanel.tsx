import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Settings as SettingsIcon, Box, Home } from "lucide-react";
import { useDesignerContext, useStyles, useItems, useProjects, useBuildingsCatalogue } from "@/hooks/useDesigner";
import { useState } from "react";
import SettingsDialog from "./SettingsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import BuildingsLibraryPanel from "./BuildingsLibraryPanel";

export default function LibraryPanel() {
  const { 
    mode, setMode,
    selectedStyleId, setSelectedStyleId, 
    selectedItemId, setSelectedItemId, 
    selectedDesignId, selectedSizeId, selectedSipThicknessId,
    setCurrentPrompt 
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

  const groupedItems = itemsData?.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof itemsData.items>) || {};

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
            {mode === 'furniture' ? <Box className="w-4 h-4" /> : <Home className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight leading-tight">3D Designer</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {mode === 'furniture' ? 'Garden Furniture' : 'Garden Buildings'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg">
          <button
            onClick={() => setMode('furniture')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'furniture' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            🌿 Furniture
          </button>
          <button
            onClick={() => setMode('building')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'building' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            🏗 Buildings
          </button>
        </div>
      </div>

      {/* Library Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {mode === 'furniture' ? (
          <Tabs defaultValue="styles" className="flex-1 flex flex-col w-full h-full min-h-0">
            <div className="px-4 pt-3 pb-1">
              <TabsList className="w-full grid grid-cols-2 h-8">
                <TabsTrigger value="styles" className="text-xs">Styles</TabsTrigger>
                <TabsTrigger value="items" className="text-xs">Items</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="styles" className="flex-1 overflow-auto data-[state=active]:flex flex-col mt-0 px-4 py-2">
              {stylesLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {stylesData?.styles.map(style => (
                    <button
                      key={style.id}
                      title={style.description}
                      onClick={() => setSelectedStyleId(style.id === selectedStyleId ? null : style.id)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium text-left transition-all border leading-tight ${
                        selectedStyleId === style.id
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background border-border hover:border-primary/60 hover:bg-primary/5 text-foreground'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="items" className="flex-1 overflow-auto data-[state=active]:flex flex-col mt-0 px-4 py-2">
              {itemsLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{category}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}
                            className={`px-2 py-2 rounded-lg text-xs font-medium text-left transition-all border leading-tight ${
                              selectedItemId === item.id
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background border-border hover:border-primary/60 hover:bg-primary/5 text-foreground'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <BuildingsLibraryPanel />
        )}
      </div>

      {/* Bottom Panel */}
      <div className="border-t border-border bg-sidebar flex flex-col shrink-0">
        {/* Current Selection */}
        <div className="px-4 py-2 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Selection</p>
          {mode === 'furniture' ? (
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
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isProjectsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="max-h-32 px-4 pb-2">
              <div className="space-y-1 pt-1">
                {!projectsData?.projects?.length && (
                  <p className="text-xs text-center text-muted-foreground py-2">No projects yet</p>
                )}
                {projectsData?.projects?.map(project => {
                  let dot = 'bg-muted-foreground';
                  if (project.status === 'processing') dot = 'bg-blue-500';
                  if (project.status === 'rendering') dot = 'bg-amber-500';
                  if (project.status === 'complete') dot = 'bg-green-500';
                  if (project.status === 'error') dot = 'bg-red-500';
                  return (
                    <button
                      key={project.id}
                      onClick={() => setCurrentPrompt(project.prompt)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted/60 transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{new Date(project.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</span>
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
