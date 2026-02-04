import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiEndpoints, EndpointCategory } from "@/data/api-endpoints";
import { BookOpen, Key, Webhook, MessageSquare, Server, AlertTriangle, Settings, Vote, Radio, CheckCircle, Search, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApiSidebarProps {
  activeSection: string;
  activeCategory: string;
  onSectionClick: (sectionId: string) => void;
  onCategoryClick: (categoryId: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4" />,
  instance: <Server className="h-4 w-4" />,
  webhooks: <Webhook className="h-4 w-4" />,
  "poll-responses": <Vote className="h-4 w-4" />,
  "webhooks-inbound": <Radio className="h-4 w-4" />,
  validation: <CheckCircle className="h-4 w-4" />,
  queries: <Search className="h-4 w-4" />,
  calls: <Phone className="h-4 w-4" />,
};

export function ApiSidebar({ activeSection, activeCategory, onSectionClick, onCategoryClick }: ApiSidebarProps) {
  const handleClick = (sectionId: string) => {
    onSectionClick(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick(categoryId);
  };

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-20">
        <ScrollArea className="h-[calc(100vh-120px)]">
          <nav className="pr-4 space-y-1">
            {/* Introduction */}
            <button
              onClick={() => handleClick("introduction")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "introduction"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Introdução
            </button>

            {/* Authentication */}
            <button
              onClick={() => handleClick("authentication")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "authentication"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Key className="h-4 w-4" />
              Autenticação
            </button>

            {/* Webhook Config */}
            <button
              onClick={() => handleClick("webhook-config")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "webhook-config"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Configurar Webhooks
            </button>

            {/* Divider */}
            <div className="pt-2 pb-1">
              <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Endpoints
              </span>
            </div>

            {/* Categories - now as direct links */}
            {apiEndpoints.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                  activeCategory === category.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {categoryIcons[category.id]}
                <span>{category.name}</span>
              </button>
            ))}

            {/* Errors */}
            <button
              onClick={() => handleClick("errors")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "errors"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Erros
            </button>
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
