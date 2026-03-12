import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useDesignerContext, useSaveProject } from "@/hooks/useDesigner";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SaveProjectDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mode, currentPrompt, selectedStyleId, selectedItemId, selectedDesignId, selectedSizeId } = useDesignerContext();
  const saveProject = useSaveProject();
  const { toast } = useToast();
  
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      const today = new Date();
      const dateStr = today.toISOString().slice(2,10).replace(/-/g, '');
      const prefix = mode === 'furniture' ? 'GF' : 'SIP';
      setName(`${prefix}${dateStr}-`);
    }
  }, [open, mode]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    saveProject.mutate({
      name,
      type: mode,
      styleId: mode === 'furniture' ? selectedStyleId : undefined,
      itemId: mode === 'furniture' ? selectedItemId : undefined,
      designId: mode === 'building' ? selectedDesignId : undefined,
      sizeId: mode === 'building' ? selectedSizeId : undefined,
      prompt: currentPrompt || "Empty prompt"
    }, {
      onSuccess: () => {
        toast({ title: "Project saved successfully" });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ title: "Failed to save project", description: err.message, variant: "destructive" });
      }
    });
  };

  const hint = mode === 'furniture' ? "GFYYMMDD-reference (max 20 chars)" : "SIPYYMMDD-reference (max 20 chars)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Project</DialogTitle>
          <DialogDescription>Save your current design context and prompt.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="projectName">Project Reference</Label>
            <Input 
              id="projectName" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder={hint}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">Format: {hint}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveProject.isPending || !name.trim()}>
            {saveProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
