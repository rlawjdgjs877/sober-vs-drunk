import { motion } from "framer-motion";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Character, type Mood } from "./Character";
import { cn } from "@/lib/utils";

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn("mx-auto w-full max-w-md px-4 pb-16 pt-4 sm:max-w-lg", className)}
    >
      {children}
    </motion.main>
  );
}

export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-2 flex h-14 items-center justify-between bg-bg/80 px-2 backdrop-blur-md">
      <button
        onClick={onBack ?? (() => nav("/"))}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition active:scale-90 hover:bg-white/5"
        aria-label="뒤로"
      >
        <ChevronLeft size={24} />
      </button>
      <div className="text-[15px] font-bold">{title}</div>
      <div className="flex w-10 justify-end">{right}</div>
    </div>
  );
}

export function VsStage({
  soberMood = "smug",
  drunkMood = "dizzy",
  size = 112,
  labels = true,
  intro = false,
}: {
  soberMood?: Mood;
  drunkMood?: Mood;
  size?: number;
  labels?: boolean;
  intro?: boolean;
}) {
  return (
    <div className="relative flex items-end justify-center gap-2">
      <div className="absolute inset-x-6 bottom-6 h-24 rounded-full bg-gradient-to-r from-sober/25 via-transparent to-drunk/25 blur-2xl" />
      <motion.div
        className="relative flex flex-col items-center"
        initial={intro ? { x: -120, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}
      >
        <Character variant="sober" mood={soberMood} facing="right" size={size} />
        {labels && <span className="mt-1 rounded-full bg-sober/15 px-3 py-1 text-xs font-bold text-sober">맨정신의 나</span>}
      </motion.div>

      <motion.div
        className="relative z-10 mb-16 px-1"
        initial={intro ? { scale: 3, opacity: 0, rotate: -20 } : { scale: 0.9 }}
        animate={{ scale: [1, 1.08, 1], opacity: 1, rotate: 0 }}
        transition={intro ? { delay: 0.55, type: "spring", stiffness: 300, damping: 12 } : { duration: 1.6, repeat: Infinity }}
      >
        <span className="text-gradient-vs block text-5xl font-black italic tracking-tighter drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]">
          VS
        </span>
      </motion.div>

      <motion.div
        className="relative flex flex-col items-center"
        initial={intro ? { x: 120, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.25 }}
      >
        <Character variant="drunk" mood={drunkMood} facing="left" size={size} />
        {labels && <span className="mt-1 rounded-full bg-drunk/15 px-3 py-1 text-xs font-bold text-drunk">지금의 나</span>}
      </motion.div>
    </div>
  );
}

export function SafetyNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-surface/60 p-4 text-[13px] leading-relaxed text-muted">
      <ShieldAlert className="mt-0.5 shrink-0 text-drunk" size={18} />
      <div className="space-y-1">
        <p className="font-semibold text-white/90">테스트 결과와 관계없이, 음주 후에는 절대 운전하지 마세요.</p>
        {!compact && (
          <>
            <p>이 서비스는 평소 대비 수행 능력 변화를 보는 게임형 자기 측정 도구예요. 혈중알코올농도 측정이나 의학적 판단을 대신하지 않으며, 주량이나 운전 가능 여부를 판정하지 않아요.</p>
            <p>술을 마시지 않아도 피로, 스트레스, 연습 효과 때문에 점수가 달라질 수 있어요.</p>
          </>
        )}
      </div>
    </div>
  );
}
