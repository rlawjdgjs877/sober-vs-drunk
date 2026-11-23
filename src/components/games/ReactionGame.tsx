import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactionResult, ReactionTrial } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

const TOTAL = 5;
const GREEN_WINDOW = 1200; // 초록일 때 반응 허용 시간
const RED_WINDOW = 900; // 빨강 표시 시간
const FEEDBACK_MS = 350;

type Phase = "wait" | "green" | "red" | "feedback" | "done";

function makeSequence(): ("green" | "red")[] {
  const greens = Math.random() < 0.5 ? 3 : 4;
  const seq: ("green" | "red")[] = [...Array(greens).fill("green"), ...Array(TOTAL - greens).fill("red")];
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  return seq;
}

export function summarizeReaction(trials: ReactionTrial[]): ReactionResult {
  const rts = trials.filter((t) => t.outcome === "hit" && t.rtMs != null).map((t) => t.rtMs!);
  const falseTaps = trials.filter((t) => t.outcome === "false" || t.outcome === "early").length;
  const misses = trials.filter((t) => t.outcome === "miss").length;
  const ok = trials.filter((t) => t.outcome === "hit" || t.outcome === "withheld").length;
  return {
    avgMs: rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null,
    bestMs: rts.length ? Math.round(Math.min(...rts)) : null,
    falseTaps,
    misses,
    hits: rts.length,
    totalTrials: trials.length,
    accuracy: trials.length ? Math.round((ok / trials.length) * 1000) / 10 : 0,
    trials,
  };
}

export function ReactionGame({ onProgress, onDone }: { onProgress: (p: number) => void; onDone: (r: ReactionResult) => void }) {
  const [seq] = useState(makeSequence);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("wait");
  const [feedback, setFeedback] = useState<{ text: string; good: boolean } | null>(null);

  const trialsRef = useRef<ReactionTrial[]>([]);
  const onsetRef = useRef(0);
  const lockedRef = useRef(true); // 반응 처리 후 다음 시행까지 입력 잠금
  const phaseRef = useRef<Phase>("wait");
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // 자극(초록/빨강)은 실제 DOM에 반영된 순간부터 유효 → phaseRef와 시작 시각은 useLayoutEffect에서 갱신
  const setP = (p: Phase) => {
    if (p !== "green" && p !== "red") phaseRef.current = p;
    setPhase(p);
  };

  useLayoutEffect(() => {
    if (phase === "green" || phase === "red") {
      onsetRef.current = performance.now();
      phaseRef.current = phase;
    }
  }, [phase]);

  const finishTrial = useCallback(
    (trial: ReactionTrial, text: string, good: boolean) => {
      lockedRef.current = true;
      clearTimers();
      trialsRef.current.push(trial);
      // 소리는 반응 이후 피드백으로만 사용 (자극 자체에는 소리를 내지 않아 시각 반응만 측정)
      sound.play(trial.outcome === "hit" ? "hit" : good ? "correct" : "wrong");
      onProgress(trialsRef.current.length / TOTAL);
      setFeedback({ text, good });
      setP("feedback");
      later(() => {
        if (trialsRef.current.length >= TOTAL) {
          setP("done");
          onDone(summarizeReaction(trialsRef.current));
        } else {
          setIndex((i) => i + 1);
        }
      }, FEEDBACK_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDone, onProgress],
  );

  // 각 시행 시작
  useEffect(() => {
    if (trialsRef.current.length >= TOTAL) return;
    const color = seq[index];
    setFeedback(null);
    setP("wait");
    lockedRef.current = false; // 대기 중 누르면 '너무 빨라요' 처리
    const delay = 500 + Math.random() * 700; // 0.5~1.2초 무작위 (예측 불가)
    later(() => {
      setP(color);
      later(
        () => {
          if (lockedRef.current) return;
          if (color === "green") finishTrial({ color, outcome: "miss", rtMs: null }, "놓쳤어요!", false);
          else finishTrial({ color, outcome: "withheld", rtMs: null }, "잘 참았어요!", true);
        },
        color === "green" ? GREEN_WINDOW : RED_WINDOW,
      );
    }, delay);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleTap = useCallback(() => {
    if (lockedRef.current) return;
    const now = performance.now();
    const p = phaseRef.current;
    const color = seq[index];
    if (p === "wait") {
      finishTrial({ color, outcome: "early", rtMs: null }, "너무 빨라요!", false);
    } else if (p === "green") {
      const rt = Math.max(0, now - onsetRef.current);
      finishTrial({ color, outcome: "hit", rtMs: Math.round(rt) }, `${Math.round(rt)}ms`, true);
    } else if (p === "red") {
      finishTrial({ color, outcome: "false", rtMs: null }, "빨간색은 누르면 안 돼요!", false);
    }
  }, [finishTrial, index, seq]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!e.repeat) handleTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleTap]);

  useEffect(() => clearTimers, []);

  const circleColor =
    phase === "green" ? "bg-[#22E07A] shadow-[0_0_80px_rgba(34,224,122,0.7)]" : phase === "red" ? "bg-[#FF3B4E] shadow-[0_0_80px_rgba(255,59,78,0.7)]" : "bg-surface2";

  return (
    <div className="no-select flex flex-col items-center">
      <p className="mb-1 text-center text-lg font-bold">
        <span className="text-[#22E07A]">초록색</span>이 되면 눌러주세요!
      </p>
      <p className="mb-6 text-center text-sm text-muted">
        <span className="text-[#FF3B4E]">빨간색</span>은 절대 누르지 마세요 · {Math.min(index + 1, TOTAL)} / {TOTAL}
      </p>

      <button
        type="button"
        data-sfx="none"
        onPointerDown={(e) => {
          e.preventDefault();
          handleTap();
        }}
        className="relative flex aspect-square w-[min(78vw,320px)] items-center justify-center rounded-full outline-none"
        aria-label="반응 원"
      >
        <div className={cn("absolute inset-0 rounded-full border-4 border-white/5", circleColor)} />
        {phase === "wait" && (
          <motion.div
            className="absolute inset-6 rounded-full border-2 border-dashed border-white/15"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        )}
        <AnimatePresence mode="wait">
          {phase === "feedback" && feedback ? (
            <motion.span
              key={`fb-${index}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("relative px-6 text-center text-2xl font-extrabold", feedback.good ? "text-good" : "text-bad")}
            >
              {feedback.text}
            </motion.span>
          ) : phase === "wait" ? (
            <span key="w" className="relative text-base font-semibold text-muted">
              기다리세요...
            </span>
          ) : phase === "green" ? (
            <span key="g" className="relative text-3xl font-black text-[#04210F]">
              지금!
            </span>
          ) : phase === "red" ? (
            <span key="r" className="relative text-3xl font-black text-white">
              참아!
            </span>
          ) : null}
        </AnimatePresence>
      </button>

      <div className="mt-6 flex gap-1.5">
        {seq.map((_, i) => {
          const t = trialsRef.current[i];
          return (
            <span
              key={i}
              className={cn(
                "h-2 w-6 rounded-full",
                !t ? (i === index ? "bg-white/40" : "bg-white/10") : t.outcome === "hit" || t.outcome === "withheld" ? "bg-good" : "bg-bad",
              )}
            />
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">PC에서는 스페이스바로도 누를 수 있어요</p>
    </div>
  );
}
