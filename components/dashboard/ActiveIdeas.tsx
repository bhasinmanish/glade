import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import type { TradeIdea } from "@/lib/types";

interface Props {
  ideas: TradeIdea[];
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  watching: "secondary",
  active: "default",
  closed: "outline",
};

export function ActiveIdeas({ ideas }: Props) {
  if (ideas.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Active Trade Ideas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/stocks/${idea.symbol}`}
                    className="font-semibold text-sm text-primary hover:underline"
                  >
                    {idea.symbol}
                  </Link>
                  <Badge variant={STATUS_VARIANT[idea.status]} className="text-[10px] py-0">
                    {idea.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{idea.thesis}</p>
                {idea.catalyst && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Catalyst: {idea.catalyst}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {idea.time_horizon.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
