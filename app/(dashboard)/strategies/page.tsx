import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StrategiesPage() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-xl bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="flex justify-center">
            <Badge variant="secondary">Phase 3</Badge>
          </div>
          <CardTitle className="mt-2">Strategies & Trade Ideas</CardTitle>
          <CardDescription>
            Define your playbook: entry/exit rules, risk params, catalyst types.
            Auto-calculated win rate and avg R from your trade log. Link trade
            ideas to strategies.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Complete Phase 2 first.
        </CardContent>
      </Card>
    </div>
  );
}
