import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiEndpoints, EndpointCategory } from "@/data/api-endpoints";
import { ChevronDown, ChevronRight, BookOpen, Key, Webhook, MessageSquare, Server, AlertTriangle, Settings, Vote, Radio, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApiSidebarProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4" />,
  instance: <Server className="h-4 w-4" />,
  webhooks: <Webhook className="h-4 w-4" />,
  "poll-responses": <Vote className="h-4 w-4" />,
  "webhooks-inbound": <Radio className="h-4 w-4" />,
  validation: <CheckCircle className="h-4 w-4" />,
};

export function ApiSidebar({ activeSection, onSectionClick }: ApiSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    apiEndpoints.map(cat => cat.id)
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleClick = (sectionId: string) => {
    onSectionClick(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

            {/* Categories */}
            {apiEndpoints.map((category) => (
              <div key={category.id}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    {categoryIcons[category.id]}
                    <span>{category.name}</span>
                  </div>
                  {expandedCategories.includes(category.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {expandedCategories.includes(category.id) && (
                  <div className="ml-4 pl-2 border-l border-border space-y-0.5">
                    {category.endpoints.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        onClick={() => handleClick(endpoint.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors text-left",
                          activeSection === endpoint.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span className={cn(
                          "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded",
                          endpoint.method === "GET" && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                          endpoint.method === "POST" && "bg-green-500/15 text-green-600 dark:text-green-400",
                          endpoint.method === "PUT" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                          endpoint.method === "DELETE" && "bg-red-500/15 text-red-600 dark:text-red-400"
                        )}>
                          {endpoint.method}
                        </span>
                        <span className="font-mono text-xs truncate">{endpoint.path}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
