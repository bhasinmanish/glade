import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: "positive" | "negative" | "neutral" | null;
}

interface Props {
  symbol: string;
}

const SENTIMENT_VARIANT = {
  positive: "profit" as const,
  negative: "loss" as const,
  neutral: "secondary" as const,
};

async function fetchNews(symbol: string): Promise<NewsItem[]> {
  // TODO: call Python service /news/{symbol} endpoint
  // which proxies Benzinga / Alpha Vantage and caches results
  return [];
}

export async function NewsFeed({ symbol }: Props) {
  const news = await fetchNews(symbol);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="h-4 w-4 text-primary" />
          News &amp; Catalysts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full px-4 pb-4">
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No recent news found for {symbol}. Connect a news API (Benzinga /
              Alpha Vantage) in the Python service to populate this feed.
            </p>
          ) : (
            <div className="space-y-3">
              {news.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-muted-foreground">
                      {item.source}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.published_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {item.sentiment && (
                      <Badge
                        variant={SENTIMENT_VARIANT[item.sentiment]}
                        className="ml-auto text-[10px] py-0"
                      >
                        {item.sentiment}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-snug">{item.headline}</p>
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
