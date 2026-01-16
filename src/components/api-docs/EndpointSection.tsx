import { Endpoint } from "@/data/api-endpoints";
import { AttributesTable } from "./AttributesTable";
import { CodeTabs } from "./CodeTabs";
import { ResponseBlock } from "./ResponseBlock";
import { cn } from "@/lib/utils";

interface EndpointSectionProps {
  endpoint: Endpoint;
}

const methodColors = {
  GET: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  POST: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export function EndpointSection({ endpoint }: EndpointSectionProps) {
  return (
    <section id={endpoint.id} className="scroll-mt-20">
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn(
              "font-mono text-sm font-bold px-3 py-1.5 rounded-md border",
              methodColors[endpoint.method]
            )}>
              {endpoint.method}
            </span>
            <code className="font-mono text-base font-semibold text-foreground">
              {endpoint.path}
            </code>
          </div>
          <p className="mt-3 text-muted-foreground">
            {endpoint.description}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Attributes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Atributos
            </h3>
            <AttributesTable attributes={endpoint.attributes} />
          </div>

          {/* Request Examples */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Requisição
            </h3>
            <CodeTabs examples={endpoint.examples} />
          </div>

          {/* Responses */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Respostas
            </h3>
            <ResponseBlock responses={endpoint.responses} />
          </div>
        </div>
      </div>
    </section>
  );
}
