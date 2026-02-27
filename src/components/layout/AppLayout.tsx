import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/30 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground" />
              <h2 className="font-display font-semibold text-foreground">Kanban Board</h2>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>

        {/* Floating chat button */}
        <Button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg glow-purple z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>

        <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </SidebarProvider>
  );
}
