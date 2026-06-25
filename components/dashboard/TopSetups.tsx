import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent, formatNumber } from "@/lib/utils";
import type { ScanResult } from "@/lib/types";
import { TrendingUp } from "lucide-react";

interface Props {
  results: ScanResult[];
}

export function TopSetups({ results }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          Today&apos;s Top Setups
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {results.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-muted-foreground">
            No scan results yet for today. The scanner runs at 7:30 AM ET.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Gap%</TableHead>
                <TableHead className="text-right">RVOL</TableHead>
                <TableHead className="text-right">ATR</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Catalyst</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.slice(0, 5).map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/stocks/${r.symbol}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {r.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">${r.price.toFixed(2)}</TableCell>
                  <TableCell className={`text-right ${r.gap_pct >= 0 ? "text-profit" : "text-loss"}`}>
                    {formatPercent(r.gap_pct)}
                  </TableCell>
                  <TableCell className="text-right">{r.rvol.toFixed(1)}x</TableCell>
                  <TableCell className="text-right">${r.atr.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs">{r.sector ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    {r.catalyst_tag ? (
                      <Badge variant="outline" className="text-xs">
                        {r.catalyst_tag}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function TopSetupsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
