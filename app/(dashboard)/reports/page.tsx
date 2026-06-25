import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
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
          <CardTitle className="mt-2">Reports</CardTitle>
          <CardDescription>
            Strategy performance, P&L calendar, and win/loss breakdown charts —
            all filterable by strategy, date range, and trade type.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Complete Phase 2 first.
        </CardContent>
      </Card>
    </div>
  );
}
