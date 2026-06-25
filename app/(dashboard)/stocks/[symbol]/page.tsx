import { KeyStatsCard } from "@/components/stocks/KeyStatsCard";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { NewsFeed } from "@/components/stocks/NewsFeed";

interface Props {
  params: Promise<{ symbol: string }>;
}

export default async function StockResearchPage({ params }: Props) {
  const { symbol } = await params;
  const ticker = symbol.toUpperCase();

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-auto">
      <div>
        <h1 className="text-2xl font-bold">{ticker}</h1>
        <p className="text-muted-foreground text-sm mt-1">Stock research</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <KeyStatsCard symbol={ticker} />
          <div className="h-[500px] rounded-lg overflow-hidden border border-border">
            <TradingViewChart symbol={ticker} />
          </div>
        </div>
        <div>
          <NewsFeed symbol={ticker} />
        </div>
      </div>
    </div>
  );
}
