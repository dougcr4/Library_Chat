import LibraryPanel from "@/components/LibraryPanel";
import ChatPanel from "@/components/ChatPanel";
import SipSchedulePanel from "@/components/SipSchedulePanel";
import { DesignerProvider, useDesignerContext } from "@/hooks/useDesigner";
import { useState } from "react";
import { ChevronRight, ChevronLeft, ClipboardList } from "lucide-react";

function DesignerLayout() {
  const { mode } = useDesignerContext();
  const [scheduleOpen, setScheduleOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      <div className="w-[320px] lg:w-[350px] shrink-0 border-r border-border bg-sidebar flex flex-col h-full shadow-sm z-10 relative">
        <LibraryPanel />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative z-0">
        <ChatPanel />
      </div>

      {mode === 'building' && (
        <>
          <button
            onClick={() => setScheduleOpen(o => !o)}
            className="shrink-0 flex items-center justify-center w-6 border-l border-border bg-muted/30 hover:bg-muted/60 transition-colors z-10"
            title={scheduleOpen ? "Hide SIP schedule" : "Show SIP schedule"}
          >
            {scheduleOpen
              ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronLeft  className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>

          {scheduleOpen && (
            <div className="w-[320px] lg:w-[360px] shrink-0 border-l border-border bg-card flex flex-col h-full shadow-sm z-10">
              <div className="flex-none h-10 border-b border-border flex items-center gap-2 px-3 bg-muted/30">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">SIP Panel Schedule</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <SipSchedulePanel />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Designer() {
  return (
    <DesignerProvider>
      <DesignerLayout />
    </DesignerProvider>
  );
}
