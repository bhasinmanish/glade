"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView: any;
  }
}

interface Props {
  symbol?: string;
  interval?: string;
}

export function TradingViewChart({ symbol = "NASDAQ:AAPL", interval = "D" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scriptId = "tradingview-script";
    const existingScript = document.getElementById(scriptId);

    function initWidget() {
      if (!containerRef.current || !window.TradingView) return;
      containerRef.current.innerHTML = "";
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "America/New_York",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "rgba(0,0,0,0)",
        enable_publishing: false,
        allow_symbol_change: true,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        withdateranges: true,
        container_id: containerRef.current.id,
      });
    }

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      initWidget();
    }
  }, [symbol, interval]);

  return (
    <div
      id="tv-chart-container"
      ref={containerRef}
      className="w-full h-full min-h-[400px]"
    />
  );
}
