"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PineScriptPanel() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<"pine" | "thinkscript">("pine");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/pine-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language }),
      });
      const data = await res.json();
      setOutput(data.code ?? "");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) {
    return (
      <div className="w-10 border-l border-border flex flex-col items-center py-4">
        <button
          onClick={() => setOpen(true)}
          title="Open Pine Script generator"
          className="p-2 rounded-md hover:bg-accent/50 transition-colors"
        >
          <Code2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Code2 className="h-4 w-4 text-primary" />
          Script Generator
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-3 border-b border-border">
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as "pine" | "thinkscript")}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pine">Pine Script v5</SelectItem>
            <SelectItem value="thinkscript">ThinkScript</SelectItem>
          </SelectContent>
        </Select>

        <Textarea
          placeholder='e.g. "Alert when 9 EMA crosses above 20 EMA on 15-min chart"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-sm min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
          }}
        />
        <Button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Generating…</>
          ) : (
            "Generate ⌘↵"
          )}
        </Button>
      </div>

      {output && (
        <>
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Output</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={copy}
            >
              {copied ? (
                <><Check className="h-3 w-3 mr-1" />Copied</>
              ) : (
                <><Copy className="h-3 w-3 mr-1" />Copy</>
              )}
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <pre className="px-4 py-3 text-xs font-mono whitespace-pre-wrap text-foreground leading-5">
              {output}
            </pre>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
