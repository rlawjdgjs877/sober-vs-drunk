import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Brain, ChevronRight, History, Swords, Sparkles } from "lucide-react";
import { Page, SafetyNote, VsStage } from "@/components/Shared";
import { useRecords } from "@/store/RecordsContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";
import { sound } from "@/lib/sound";

function MenuButton({
  icon,
  title,
  desc,
  tone,
  onClick,
  highlight,
  badge,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  tone: "sober" | "drunk" | "muted";
  onClick: () => void;
  highlight?: boolean;
  badge?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-4 rounded-3xl border bg-surface p-4 text-left shadow-card transition",
        tone === "sober" && "border-sober/30 hover:border-sober/60",
        tone === "drunk" && "border-drunk/30 hover:border-drunk/60",
        tone === "muted" && "border-line hover:border-white/20",
        highlight && tone === "sober" && "ring-2 ring-sober/60 shadow-sober",
        highlight && tone === "drunk" && "ring-2 ring-drunk/60 shadow-drunk",
        disabled && "opacity-60",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          tone === "sober" && "bg-sober/15 text-sober",
          tone === "drunk" && "bg-drunk/15 text-drunk",
          tone === "muted" && "bg-white/5 text-white/80",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-bold">{title}</span>
          {badge}
        </div>
        <div className="mt-0.5 text-[13px] text-muted">{desc}</div>
      </div>
      <ChevronRight className="text-white/40 transition group-hover:translate-x-0.5" size={20} />
    </motion.button>
  );
}

export default function Home() {
  const nav = useNavigate();
  const { baseline, tests, ready } = useRecords();
  const firstVisit = ready && !baseline;

  // 입장 연출 효과음 (자동재생이 막힌 경우 첫 터치 때 재생)
  useEffect(() => {
    const t = setTimeout(() => sound.play("intro"), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <Page className="pt-8">
      <div className="mb-2 flex items-center justify-center">
        <span className="rounded-full border border-line bg-surface/70 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-muted">
          SOBER <span className="text-sober">●</span> VS <span className="text-drunk">●</span> DRUNK
        </span>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center text-[28px] font-extrabold leading-[1.3] tracking-tight sm:text-[32px]"
      >
        지금의 나는
        <br />
        <span className="text-sober">맨정신의 나</span>를<br />
        이길 수 있을까?
      </motion.h1>

      <div className="mt-8">
        <VsStage intro soberMood="smug" drunkMood={firstVisit ? "shocked" : "dizzy"} />
      </div>

      {firstVisit && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-6 flex items-start gap-3 rounded-2xl border border-sober/30 bg-sober/10 p-4 text-sm"
        >
          <Sparkles className="mt-0.5 shrink-0 text-sober" size={18} />
          <p className="leading-relaxed text-white/90">
            처음 오셨네요! 비교하려면 <b className="text-sober">맨정신일 때의 기록</b>이 먼저 필요해요. 3가지 미니게임으로 30초면 끝나요.
          </p>
        </motion.div>
      )}

      <div className="mt-6 space-y-3">
        <MenuButton
          icon={<Brain size={24} />}
          tone="sober"
          title="맨정신 기록 등록하기"
          desc={baseline ? `평소 능력 측정 · 기준 기록 ${baseline.count}회` : "평소 능력 측정 · 여기서 시작하세요"}
          highlight={firstVisit}
          badge={baseline?.isTemporary ? <Badge tone="sober">임시 기준</Badge> : undefined}
          onClick={() => nav("/baseline")}
        />
        <MenuButton
          icon={<Swords size={24} />}
          tone="drunk"
          title="지금의 나 테스트하기"
          desc={baseline ? "기존 맨정신 기록과 비교" : "맨정신 기록을 먼저 등록해 주세요"}
          highlight={!!baseline && tests.length === 0}
          disabled={!baseline}
          onClick={() => nav("/test")}
        />
        <MenuButton
          icon={<History size={24} />}
          tone="muted"
          title="나의 대결 기록"
          desc={tests.length ? `지금까지 ${tests.length}번 대결했어요` : "과거 테스트 결과 확인"}
          onClick={() => nav("/history")}
        />
      </div>

      <div className="mt-8">
        <SafetyNote />
      </div>
    </Page>
  );
}
