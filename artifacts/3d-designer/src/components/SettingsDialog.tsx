import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/useDesigner";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SettingsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "qwen2.5",
    openWebUiUrl: "http://localhost:3001"
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        ollamaUrl: settings.ollamaUrl || "http://localhost:11434",
        ollamaModel: settings.ollamaModel || "qwen2.5",
        openWebUiUrl: settings.openWebUiUrl || "http://localhost:3001"
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
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
          </div>
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
