"use client";

import * as React from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatDrawer({
  open,
  onOpenChange,
  planId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId?: string;
}) {
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const content = input.trim();
    if (!content || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, planId }),
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMsgs((curr) => [...curr, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Vercel AI SDK data-stream lines: `0:"token"\n`, we extract text segments of type 0.
        const pieces = chunk.split("\n").filter(Boolean);
        for (const p of pieces) {
          const colonIdx = p.indexOf(":");
          if (colonIdx < 0) continue;
          const type = p.slice(0, colonIdx);
          const rest = p.slice(colonIdx + 1);
          if (type !== "0") continue;
          try {
            const text = JSON.parse(rest);
            assistant += text;
            setMsgs((curr) => {
              const copy = [...curr];
              copy[copy.length - 1] = { role: "assistant", content: assistant };
              return copy;
            });
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: err instanceof Error ? err.message : "Error" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-xl transition-transform",
        open ? "translate-x-0" : "translate-x-full"
      )}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b p-3">
        <div>
          <div className="text-sm font-semibold">Coach chat</div>
          <div className="text-xs text-muted-foreground">
            Ask for tweaks. Structural changes still need a regenerate.
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {msgs.length === 0 ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">
            Try: &quot;Move my long run to Sunday&quot; or &quot;Why is this week so easy?&quot;
          </div>
        ) : (
          msgs.map((m, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap rounded-md px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-8 bg-primary text-primary-foreground"
                  : "mr-8 bg-muted"
              )}
            >
              {m.content}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Input
          placeholder="Ask the coach..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
