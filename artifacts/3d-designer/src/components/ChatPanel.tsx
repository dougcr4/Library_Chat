import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Send, Bot, User, Box, Loader2, RotateCw } from "lucide-react";
import { useDesignerContext, useStyles, useItems, useGenerateModel } from "@/hooks/useDesigner";
import SaveProjectDialog from "./SaveProjectDialog";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatPanel() {
  const { 
    selectedStyleId, setSelectedStyleId, 
    selectedItemId, setSelectedItemId, 
    messages, setMessages,
    currentPrompt, setCurrentPrompt,
    resetDesign
  } = useDesignerContext();

  const { data: stylesData } = useStyles();
  const { data: itemsData } = useItems();
  const generateModel = useGenerateModel();
  
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedStyle = stylesData?.styles.find(s => s.id === selectedStyleId);
  const selectedItem = itemsData?.items.find(i => i.id === selectedItemId);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!currentPrompt.trim() || generateModel.isPending) return;

    const userMessage = { role: 'user' as const, content: currentPrompt, type: 'text' as const };
    const loadingMessage = { role: 'system' as const, content: '', type: 'model' as const, isGenerating: true, stage: 'Initializing...' };
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    const promptToSend = currentPrompt;
    setCurrentPrompt("");

    generateModel.mutate({
      styleId: selectedStyleId,
      itemId: selectedItemId,
      prompt: promptToSend
    }, {
      onSuccess: (data) => {
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
      },
      onError: (err) => {
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
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <header className="flex-none h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Garden Furniture Designer</h2>
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

      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-lg mx-auto space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 shadow-sm">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">Welcome to 3D Designer</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Select a style and/or item from the library on the left, then describe your furniture with dimensions to generate a 3D model.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
                    <Card className="w-80 shadow-md border-primary/20 bg-primary/5 animate-pulse">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Generating Model</p>
                          <p className="text-xs text-muted-foreground">{msg.stage}</p>
                        </div>
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
                      <div className="w-full bg-[#1a1c1e] rounded-xl border border-border/20 h-[350px] flex flex-col items-center justify-center text-muted-foreground shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        <RotateCw className="w-10 h-10 mb-4 opacity-50" />
                        <p className="font-medium tracking-wide text-lg text-gray-300">3D Model Viewer</p>
                        <p className="text-sm opacity-50 mt-1 text-gray-400">Interactive preview would appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border absolute bottom-0 left-0 right-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          {(selectedStyle || selectedItem) && (
            <div className="flex gap-2 items-center px-1">
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
          <div className="relative flex items-end gap-2 bg-card rounded-2xl border-2 border-input shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2">
            <Textarea 
              className="flex-1 min-h-[64px] max-h-[200px] border-0 focus-visible:ring-0 shadow-none resize-none bg-transparent p-3 text-base leading-relaxed"
              placeholder="Describe your furniture with dimensions (e.g. 'Round garden table, 1200mm diameter, 750mm high...')"
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
                disabled={!currentPrompt.trim() || generateModel.isPending}
              >
                {generateModel.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
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
