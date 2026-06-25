import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  symbol: string;
}

interface StatItemProps {
  label: string;
  value: string;
  className?: string;
}

function StatItem({ label, value, className }: StatItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold font-mono ${className ?? ""}`}>{value}</span>
    </div>
  );
}

export async function KeyStatsCard({ symbol }: Props) {
  // TODO: fetch live stats from Python service / Polygon fallback
  // For now render a placeholder grid showing what will be here
  const stats: StatItemProps[] = [
    { label: "Price", value: "—" },
    { label: "Chg%", value: "—" },
    { label: "Gap%", value: "—" },
    { label: "RVOL", value: "—" },
    { label: "ATR", value: "—" },
    { label: "Float", value: "—" },
    { label: "Mkt Cap", value: "—" },
    { label: "P/E", value: "—" },
    { label: "Volume", value: "—" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{symbol} — Key Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {stats.map((s) => (
            <StatItem key={s.label} {...s} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function KeyStatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
