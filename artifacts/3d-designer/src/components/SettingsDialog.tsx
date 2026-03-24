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
    ollamaModel: "qwen2.5:14b",
    openWebUiUrl: "http://localhost:3001",
    openWebUiModel: "joshuaokolo-cad-designer",
    openWebUiApiKey: "",
    cadqueryViewerUrl: "http://localhost:5000",
    jupyterLabUrl: "http://localhost:8888",
    jupyterLabWorkDir: "",
    sharedDesignsPath: "/home/douglas/DockerProjects/LLM-3D/shared_designs"
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        ollamaUrl: settings.ollamaUrl || "http://localhost:11434",
        ollamaModel: settings.ollamaModel || "qwen2.5:14b",
        openWebUiUrl: settings.openWebUiUrl || "http://localhost:3001",
        openWebUiModel: (settings as any).openWebUiModel || "joshuaokolo-cad-designer",
        openWebUiApiKey: settings.openWebUiApiKey || "",
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

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open-WebUI (AI via API key)</p>

              <div className="grid gap-2">
                <Label htmlFor="openWebUiUrl">Open-WebUI URL</Label>
                <Input 
                  id="openWebUiUrl" 
                  value={formData.openWebUiUrl} 
                  onChange={e => setFormData({...formData, openWebUiUrl: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openWebUiModel">Open-WebUI Model Name</Label>
                <Input 
                  id="openWebUiModel"
                  placeholder="joshuaokolo-cad-designer"
                  value={formData.openWebUiModel} 
                  onChange={e => setFormData({...formData, openWebUiModel: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">
                  The pipeline or model name exactly as it appears in Open-WebUI (e.g. joshuaokolo-cad-designer).
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openWebUiApiKey">Open-WebUI API Key</Label>
                <Input 
                  id="openWebUiApiKey"
                  type="password"
                  placeholder="sk-… — leave blank to use Ollama directly instead"
                  value={formData.openWebUiApiKey} 
                  onChange={e => setFormData({...formData, openWebUiApiKey: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">
                  Open-WebUI → avatar → Account → API Keys → Create new key. When set, all AI calls go through Open-WebUI using the model name above.
                </p>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Ollama Direct (no API key)</p>

              <div className="grid gap-2">
                <Label htmlFor="ollamaUrl">Ollama URL</Label>
                <Input 
                  id="ollamaUrl" 
                  value={formData.ollamaUrl} 
                  onChange={e => setFormData({...formData, ollamaUrl: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ollamaModel">Ollama Model Name</Label>
                <Input 
                  id="ollamaModel"
                  placeholder="qwen2.5:14b"
                  value={formData.ollamaModel} 
                  onChange={e => setFormData({...formData, ollamaModel: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">
                  A model actually pulled in Ollama (e.g. qwen2.5:14b). Only used when no API key is set above.
                </p>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Docker Services</p>

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
