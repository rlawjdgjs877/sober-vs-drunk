import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tones = {
  sober: "bg-sober/15 text-sober border-sober/30",
  drunk: "bg-drunk/15 text-drunk border-drunk/30",
  good: "bg-good/15 text-good border-good/30",
  bad: "bg-bad/15 text-bad border-bad/30",
  muted: "bg-white/5 text-muted border-line",
};

export function Badge({ children, tone = "muted", className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}
