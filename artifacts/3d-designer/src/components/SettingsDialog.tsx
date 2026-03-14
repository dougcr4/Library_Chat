import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/useDesigner";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SettingsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "qwen2.5",
    openWebUiUrl: "http://localhost:3001",
    cadqueryViewerUrl: "http://localhost:5000",
    jupyterLabUrl: "http://localhost:8888",
    jupyterLabWorkDir: "",
    sharedDesignsPath: "/home/douglas/DockerProjects/LLM-3D/shared_designs"
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        ollamaUrl: settings.ollamaUrl || "http://localhost:11434",
        ollamaModel: settings.ollamaModel || "qwen2.5",
        openWebUiUrl: settings.openWebUiUrl || "http://localhost:3001",
        cadqueryViewerUrl: settings.cadqueryViewerUrl || "http://localhost:5000",
        jupyterLabUrl: settings.jupyterLabUrl || "http://localhost:8888",
        jupyterLabWorkDir: settings.jupyterLabWorkDir || "",
        sharedDesignsPath: settings.sharedDesignsPath || "/home/douglas/DockerProjects/LLM-3D/shared_designs"
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formData, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ title: "Failed to save settings", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ollamaUrl">Ollama URL</Label>
                <Input 
                  id="ollamaUrl" 
                  value={formData.ollamaUrl} 
                  onChange={e => setFormData({...formData, ollamaUrl: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="modelName">Model Name</Label>
                <Input 
                  id="modelName" 
                  value={formData.ollamaModel} 
                  onChange={e => setFormData({...formData, ollamaModel: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openWebUi">Open-WebUI URL</Label>
                <Input 
                  id="openWebUi" 
                  value={formData.openWebUiUrl} 
                  onChange={e => setFormData({...formData, openWebUiUrl: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cadqueryViewerUrl">CadQuery Viewer URL</Label>
                <Input 
                  id="cadqueryViewerUrl" 
                  value={formData.cadqueryViewerUrl} 
                  onChange={e => setFormData({...formData, cadqueryViewerUrl: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jupyterLabUrl">JupyterLab URL</Label>
                <Input 
                  id="jupyterLabUrl" 
                  value={formData.jupyterLabUrl} 
                  onChange={e => setFormData({...formData, jupyterLabUrl: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jupyterLabWorkDir">JupyterLab Notebook Directory</Label>
                <Input 
                  id="jupyterLabWorkDir" 
                  placeholder="e.g. home/cq/work  (leave blank to open JupyterLab root)"
                  value={formData.jupyterLabWorkDir} 
                  onChange={e => setFormData({...formData, jupyterLabWorkDir: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sharedDesignsPath">Shared Designs Folder Path</Label>
                <Input 
                  id="sharedDesignsPath" 
                  value={formData.sharedDesignsPath} 
                  onChange={e => setFormData({...formData, sharedDesignsPath: e.target.value})} 
                />
              </div>
            </div>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
