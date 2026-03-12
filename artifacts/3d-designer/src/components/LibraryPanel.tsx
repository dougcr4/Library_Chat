import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Check, Settings as SettingsIcon, Box, Home } from "lucide-react";
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

  // Group items
  const groupedItems = itemsData?.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof itemsData.items>) || {};

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-border bg-sidebar">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            {mode === 'furniture' ? <Box className="w-6 h-6" /> : <Home className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">3D Designer</h1>
            <Badge variant="secondary" className="mt-1 font-medium bg-accent/20 text-accent-foreground border-accent/20">
              {mode === 'furniture' ? 'Garden Furniture' : 'Garden Buildings'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setMode('furniture')}
            className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'furniture' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            🌿 Furniture
          </button>
          <button
            onClick={() => setMode('building')}
            className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'building' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            🏗 Buildings
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {mode === 'furniture' ? (
          <Tabs defaultValue="styles" className="flex-1 flex flex-col w-full h-full">
            <div className="px-6 pt-4">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="styles">Styles</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="styles" className="flex-1 overflow-hidden data-[state=active]:flex flex-col mt-0">
              <ScrollArea className="flex-1 px-6 py-4">
                {stylesLoading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stylesData?.styles.map(style => (
                      <Card 
                        key={style.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedStyleId === style.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}
                        onClick={() => setSelectedStyleId(style.id === selectedStyleId ? null : style.id)}
                      >
                        <CardContent className="p-4 flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              {style.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">{style.description}</p>
                          </div>
                          {selectedStyleId === style.id && <Check className="w-5 h-5 text-primary shrink-0" />}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="items" className="flex-1 overflow-hidden data-[state=active]:flex flex-col mt-0">
              <ScrollArea className="flex-1 px-6 py-4">
                {itemsLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{category}</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {items.map(item => (
                            <Card 
                              key={item.id}
                              className={`cursor-pointer transition-all duration-200 text-center ${selectedItemId === item.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}
                              onClick={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}
                            >
                              <CardContent className="p-4 flex flex-col items-center justify-center relative min-h-[100px]">
                                {selectedItemId === item.id && <Check className="w-4 h-4 text-primary absolute top-2 right-2" />}
                                <span className="font-medium text-sm">{item.name}</span>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <BuildingsLibraryPanel />
        )}
      </div>

      <div className="mt-auto border-t border-border bg-sidebar flex flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2">Current Selection</p>
          
          {mode === 'furniture' ? (
            selectedStyle || selectedItem ? (
              <div className="flex flex-wrap gap-2">
                {selectedStyle && <Badge variant="default" className="bg-primary hover:bg-primary text-primary-foreground">{selectedStyle.name}</Badge>}
                {selectedItem && <Badge variant="outline" className="border-primary text-primary">{selectedItem.name}</Badge>}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Nothing selected</p>
            )
          ) : (
            selectedDesign || selectedSize || selectedSipThickness ? (
              <div className="flex flex-wrap gap-2">
                {selectedDesign && <Badge variant="default" className="bg-primary hover:bg-primary text-primary-foreground">{selectedDesign.name}</Badge>}
                {selectedSize && <Badge variant="outline" className="border-primary text-primary">{selectedSize.label}</Badge>}
                {selectedSipThickness && <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">{selectedSipThickness.label}</Badge>}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Nothing selected</p>
            )
          )}
        </div>

        <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors">
            Recent Projects
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProjectsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-48 px-4 pb-4">
              <div className="space-y-2 pt-2">
                {projectsData?.projects?.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">No projects yet</p>
                )}
                {projectsData?.projects?.map(project => {
                  let badgeColors = 'bg-muted text-muted-foreground border-border';
                  if (project.status === 'queued') badgeColors = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
                  if (project.status === 'processing') badgeColors = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300';
                  if (project.status === 'rendering') badgeColors = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300';
                  if (project.status === 'complete') badgeColors = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300';
                  if (project.status === 'error') badgeColors = 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300';

                  return (
                    <Card key={project.id} className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => setCurrentPrompt(project.prompt)}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{project.name}</span>
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 capitalize ${badgeColors}`}>
                            {project.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span className="capitalize">{project.type}</span>
                          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>

        <div className="p-4 flex justify-between items-center border-t border-border bg-sidebar">
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="text-muted-foreground hover:text-foreground">
            <SettingsIcon className="w-5 h-5" />
          </Button>
          <span className="text-xs text-muted-foreground">v1.0.0</span>
        </div>
      </div>
      
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
