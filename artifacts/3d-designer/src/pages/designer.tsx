import LibraryPanel from "@/components/LibraryPanel";
import ChatPanel from "@/components/ChatPanel";
import { DesignerProvider } from "@/hooks/useDesigner";

export default function Designer() {
  return (
    <DesignerProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
        <div className="w-[320px] lg:w-[350px] shrink-0 border-r border-border bg-sidebar flex flex-col h-full shadow-sm z-10 relative">
          <LibraryPanel />
        </div>
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative z-0">
          <ChatPanel />
        </div>
      </div>
    </DesignerProvider>
  );
}
