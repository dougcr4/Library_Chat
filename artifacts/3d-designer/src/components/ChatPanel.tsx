import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Send, Bot, User, ExternalLink, RotateCw, Loader2, AlertTriangle, CheckCircle2, Circle, Wand2, Pencil } from "lucide-react";
import { useDesignerContext, useStyles, useItems, useGenerateModel, useBuildingsCatalogue, useGenerateBuilding, useSettings, useFixDesign, useRefineDesign } from "@/hooks/useDesigner";
import SaveProjectDialog from "./SaveProjectDialog";
import { Card, CardContent } from "@/components/ui/card";

const PIPELINE_STAGES = [
  { key: 'ai',     label: 'Calling AI model',          detail: 'Sending prompt to Ollama…'                          },
  { key: 'script', label: 'Generating CadQuery script', detail: 'AI writing Python (30–90 s)…'                       },
  { key: 'write',  label: 'Writing design file',        detail: 'Saving latest_design.py to shared designs folder…' },
  { key: 'viewer', label: 'Loading 3D viewer',          detail: 'CadQuery server rendering model…'                  },
];

function PipelineProgress({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="w-full space-y-2 py-1">
      {PIPELINE_STAGES.map((s, i) => {
        const done    = i < stageIndex;
        const active  = i === stageIndex;
        const pending = i > stageIndex;
        return (
          <div key={s.key} className={`flex items-start gap-3 text-sm transition-opacity duration-300 ${pending ? 'opacity-30' : 'opacity-100'}`}>
            <span className="mt-0.5 shrink-0">
              {done   && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {active && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {pending && <Circle className="w-4 h-4 text-muted-foreground" />}
            </span>
            <div>
              <p className={`font-medium leading-tight ${active ? 'text-foreground' : done ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>{s.label}</p>
              {active && <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ChatPanel() {
  const { 
    mode,
    selectedStyleId, setSelectedStyleId, 
    selectedItemId, setSelectedItemId, 
    selectedDesignId, setSelectedDesignId,
    selectedSizeId, setSelectedSizeId,
    fitoutSelections,
    messages, setMessages,
    currentPrompt, setCurrentPrompt,
    resetDesign
  } = useDesignerContext();

  const { data: stylesData } = useStyles();
  const { data: itemsData } = useItems();
  const { data: catalogueData } = useBuildingsCatalogue();
  const { data: settingsData } = useSettings();
  const generateModel = useGenerateModel();
  const generateBuilding = useGenerateBuilding();
  const fixDesign = useFixDesign();
  const refineDesign = useRefineDesign();
  const jupyterLabUrl = (settingsData?.jupyterLabUrl || "http://localhost:8888").replace(/\/$/, "");
  const jupyterLabWorkDir = (settingsData?.jupyterLabWorkDir || "").replace(/^\/|\/$/g, "");
  const notebookUrl = jupyterLabWorkDir
    ? `${jupyterLabUrl}/lab/tree/${jupyterLabWorkDir}/view_latest.ipynb`
    : `${jupyterLabUrl}/lab`;
  const cadqueryBaseUrl = (settingsData?.cadqueryViewerUrl || "http://localhost:5000").replace(/\/$/, "");
  const [pipelineStage, setPipelineStage] = useState(0);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRefineMode = scriptReady;
  const isPending = generateModel.isPending || generateBuilding.isPending || refineDesign.isPending;

  useEffect(() => {
    if (isPending) {
      setPipelineStage(0);
      stageTimerRef.current = setTimeout(() => setPipelineStage(1), 4000);
    } else {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    }
    return () => { if (stageTimerRef.current) clearTimeout(stageTimerRef.current); };
  }, [isPending]);
  
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedStyle = stylesData?.styles.find(s => s.id === selectedStyleId);
  const selectedItem = itemsData?.items.find(i => i.id === selectedItemId);
  const selectedDesign = catalogueData?.designs.find(d => d.id === selectedDesignId);
  const selectedSize = catalogueData?.sizes.find(s => s.id === selectedSizeId);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (isPending) return;
    if (!currentPrompt.trim()) return;

    const userMessageContent = currentPrompt.trim();
    const userMessage = { role: 'user' as const, content: userMessageContent, type: 'text' as const };
    const loadingMessage = { role: 'system' as const, content: '', type: 'model' as const, isGenerating: true, stage: 'Initializing...' };

    const promptToSend = currentPrompt.trim();
    setCurrentPrompt("");

    const handleSuccess = (data: any) => {
      const newUrl = `${cadqueryBaseUrl}?module=latest_design&t=${Date.now()}`;
      setPipelineStage(2);
      setTimeout(() => {
        setPipelineStage(3);
        setViewerUrl(newUrl);
        setScriptReady(true);
        setTimeout(() => {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'system',
              content: data.modelOutput || "Model generated successfully.",
              type: 'model',
              isGenerating: false,
            };
            return newMessages;
          });
        }, 800);
      }, 1000);
    };

    const handleError = (err: any) => {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'system',
          content: err.message.includes('Ollama')
            ? "⚠️ Could not connect to local AI backend. Go to Settings to check your Ollama URL."
            : `Error: ${err.message}`,
          type: 'error',
          isGenerating: false,
        };
        return newMessages;
      });
    };

    // Refinement mode — modify the existing design
    if (isRefineMode) {
      setMessages(prev => [...prev, userMessage, loadingMessage]);
      refineDesign.mutate(promptToSend, { onSuccess: handleSuccess, onError: handleError });
      return;
    }

    // Fresh generation
    setScriptReady(false);
    setViewerUrl(null);
    setMessages(prev => [...prev, userMessage, loadingMessage]);

    if (mode === 'furniture') {
      generateModel.mutate({
        styleId: selectedStyleId,
        itemId: selectedItemId,
        prompt: promptToSend
      }, { onSuccess: handleSuccess, onError: handleError });
    } else {
      generateBuilding.mutate({
        designId: selectedDesignId,
        sizeId: selectedSizeId,
        fitoutSelections,
        additionalNotes: promptToSend
      }, { onSuccess: handleSuccess, onError: handleError });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasFlags = selectedSize && (selectedSize.planningFlag || selectedSize.buildingRegsFlag);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <header className="flex-none h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {mode === 'furniture' ? 'Garden Furniture Designer' : 'Garden Buildings Designer'}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetDesign} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Design</span>
          </Button>
          <Button variant="default" size="sm" onClick={() => setIsSaveOpen(true)} className="gap-2">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Project</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-lg mx-auto space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 shadow-sm">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">Welcome to 3D Designer</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {mode === 'furniture' 
                  ? "Select a style and/or item from the library on the left, then describe your furniture with dimensions to generate a 3D model."
                  : "Select a shell design, size and SIP thickness from the library, then configure your fit-out options to generate a 3D model."}
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`} data-last={idx === messages.length - 1}>
                <Avatar className={`w-8 h-8 border shadow-sm ${msg.role === 'user' ? 'bg-primary border-primary' : 'bg-card border-border'}`}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-primary-foreground m-auto" />
                  ) : (
                    <Bot className="w-4 h-4 text-foreground m-auto" />
                  )}
                </Avatar>
                
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'user' && (
                    <div className="bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm text-base">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}

                  {msg.role === 'system' && msg.type === 'error' && (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 px-5 py-3.5 rounded-2xl rounded-tl-sm text-sm font-medium shadow-sm">
                      {msg.content}
                    </div>
                  )}

                  {msg.role === 'system' && msg.type === 'model' && msg.isGenerating && (
                    <Card className="w-80 shadow-md border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm text-foreground mb-3">Generating 3D Design</p>
                        <PipelineProgress stageIndex={pipelineStage} />
                      </CardContent>
                    </Card>
                  )}

                  {msg.role === 'system' && msg.type === 'model' && !msg.isGenerating && (
                    <div className="space-y-4 w-full">
                      {msg.content && msg.content !== "Model generated successfully." && (
                        <div className="bg-muted px-5 py-4 rounded-2xl rounded-tl-sm text-sm font-mono overflow-x-auto border border-border shadow-sm">
                          <pre className="text-muted-foreground">{msg.content}</pre>
                        </div>
                      )}
                      {viewerUrl && idx === messages.length - 1 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-medium text-muted-foreground">3D Viewer — CadQuery Server</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                disabled={fixDesign.isPending}
                                title="Ask AI to fix the script — paste the error from the viewer into the prompt box first for best results"
                                onClick={() => {
                                  const errorHint = currentPrompt.trim() || undefined;
                                  fixDesign.mutate(errorHint, {
                                    onSuccess: () => {
                                      setCurrentPrompt("");
                                      setViewerUrl(`${cadqueryBaseUrl}?module=latest_design&t=${Date.now()}`);
                                    },
                                    onError: (err) => {
                                      setMessages(prev => [...prev, {
                                        role: 'system' as const,
                                        content: `Fix failed: ${err.message}`,
                                        type: 'error' as const,
                                        isGenerating: false,
                                      }]);
                                    }
                                  });
                                }}
                              >
                                {fixDesign.isPending
                                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Fixing…</>
                                  : <><Wand2 className="w-3 h-3" /> Fix Script</>}
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={() => setViewerUrl(`${cadqueryBaseUrl}?module=latest_design&t=${Date.now()}`)}
                              >
                                <RotateCw className="w-3 h-3" /> Reload
                              </Button>
                            </div>
                          </div>
                          <iframe
                            src={viewerUrl}
                            className="w-full rounded-xl border border-border/20 h-[480px]"
                            title="CadQuery 3D Viewer"
                            sandbox="allow-scripts allow-same-origin allow-forms"
                          />
                        </div>
                      )}
                      {scriptReady && idx === messages.length - 1 && (
                        <Card className="border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20 shadow-sm">
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-sm text-green-800 dark:text-green-300">Also available in JupyterLab</p>
                              <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-0.5">
                                {jupyterLabWorkDir
                                  ? <>Opens <span className="font-mono">view_latest.ipynb</span> — run all cells for an interactive 3D view.</>
                                  : <>Opens JupyterLab — navigate to <span className="font-mono">view_latest.ipynb</span> and run all cells.</>}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="shrink-0 gap-2 bg-green-700 hover:bg-green-800 text-white dark:bg-green-700 dark:hover:bg-green-600"
                              onClick={() => window.open(notebookUrl, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open in JupyterLab
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-none p-4 bg-background/80 backdrop-blur-md border-t border-border shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          
          {mode === 'furniture' && (selectedStyle || selectedItem) && (
            <div className="flex gap-2 items-center px-1 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Context:</span>
              {selectedStyle && (
                <Badge variant="secondary" className="px-2.5 py-0.5 pr-1 gap-1.5 flex items-center bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 shadow-sm">
                  {selectedStyle.name}
                  <button onClick={() => setSelectedStyleId(null)} className="hover:bg-primary/20 rounded-full p-0.5"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                </Badge>
              )}
              {selectedItem && (
                <Badge variant="secondary" className="px-2.5 py-0.5 pr-1 gap-1.5 flex items-center bg-accent/10 hover:bg-accent/20 text-accent-foreground border-accent/20 shadow-sm">
                  {selectedItem.name}
                  <button onClick={() => setSelectedItemId(null)} className="hover:bg-accent/20 rounded-full p-0.5"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                </Badge>
              )}
            </div>
          )}

          {mode === 'building' && (selectedDesign || selectedSize || hasFlags) && (
            <div className="flex gap-2 items-center px-1 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Context:</span>
              {selectedDesign && (
                <Badge variant="secondary" className="px-2.5 py-0.5 pr-1 gap-1.5 flex items-center bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 shadow-sm">
                  {selectedDesign.name}
                  <button onClick={() => setSelectedDesignId(null)} className="hover:bg-primary/20 rounded-full p-0.5"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                </Badge>
              )}
              {selectedSize && (
                <Badge variant="secondary" className="px-2.5 py-0.5 pr-1 gap-1.5 flex items-center bg-accent/10 hover:bg-accent/20 text-accent-foreground border-accent/20 shadow-sm">
                  {selectedSize.label}
                  <button onClick={() => setSelectedSizeId(null)} className="hover:bg-accent/20 rounded-full p-0.5"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                </Badge>
              )}
              {hasFlags && (
                <Badge variant="secondary" className="px-2.5 py-0.5 gap-1.5 flex items-center bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50">
                  <AlertTriangle className="w-3 h-3" />
                  {selectedSize.buildingRegsFlag ? 'Planning & Regs Required' : 'Planning Required'}
                </Badge>
              )}
            </div>
          )}

          {isRefineMode && (
            <div className="flex items-center gap-2 px-1">
              <Badge variant="secondary" className="gap-1.5 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50 font-medium">
                <Pencil className="w-3 h-3" />
                Refining existing design
              </Badge>
              <span className="text-xs text-muted-foreground">— or click <strong>New Design</strong> to start fresh</span>
            </div>
          )}
          <div className="relative flex items-end gap-2 bg-card rounded-2xl border-2 border-input shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2">
            <Textarea 
              className="flex-1 min-h-[64px] max-h-[200px] border-0 focus-visible:ring-0 shadow-none resize-none bg-transparent p-3 text-base leading-relaxed"
              placeholder={isRefineMode
                ? "Describe what to change (e.g. 'make the walls 300mm taller' or 'add a window in the front wall')"
                : mode === 'furniture' 
                  ? "Describe your furniture with dimensions (e.g. 'Round garden table, 1200mm diameter, 750mm high...')" 
                  : "Any additional notes or bespoke requirements? (e.g. 'include a 2m wide veranda on the south-facing side')"}
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <div className="pb-2 pr-2 shrink-0">
              <Button 
                size="icon" 
                className="rounded-xl w-12 h-12 shadow-sm transition-transform active:scale-95"
                onClick={handleSend}
                disabled={isPending || !currentPrompt.trim()}
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
              </Button>
            </div>
          </div>
          <div className="text-center">
            <span className="text-[11px] text-muted-foreground/70 font-medium">Press <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-foreground">Ctrl</kbd> + <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-foreground">Enter</kbd> to send</span>
          </div>
        </div>
      </div>

      <SaveProjectDialog open={isSaveOpen} onOpenChange={setIsSaveOpen} />
    </div>
  );
}
