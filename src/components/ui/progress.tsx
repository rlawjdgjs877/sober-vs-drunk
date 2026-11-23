import { cn } from "@/lib/utils";

export function Progress({ value, className, tone = "sober" }: { value: number; className?: string; tone?: "sober" | "drunk" }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone === "sober" ? "bg-sober" : "bg-drunk")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
