import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowBigLeft, ArrowBigRight, Check, X } from "lucide-react";
import type { ArrowResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

const TOTAL = 5;
const TIME_LIMIT = 2000;
const FEEDBACK_MS = 250;

type Dir = "left" | "right";
type Q = { arrow: Dir; word: Dir; wordSide: Dir };

function makeQuestions(): Q[] {
  // 3문제는 글자와 화살표가 불일치, 2문제는 일치 → 순서 무작위
  const flags = [...Array(3).fill(true), ...Array(2).fill(false)];
  for (let i = flags.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flags[i], flags[j]] = [flags[j], flags[i]];
  }
  return flags.map((incongruent) => {
    const arrow: Dir = Math.random() < 0.5 ? "left" : "right";
    const word: Dir = incongruent ? (arrow === "left" ? "right" : "left") : arrow;
    const wordSide: Dir = Math.random() < 0.5 ? "left" : "right";
    return { arrow, word, wordSide };
  });
}

type Answer = { correct: boolean; rtMs: number };

export function ArrowGame({ onProgress, onDone }: { onProgress: (p: number) => void; onDone: (r: ArrowResult) => void }) {
  const [qs] = useState(makeQuestions);
  const [index, setIndex] = useState(0);
  const [fb, setFb] = useState<null | { correct: boolean; timeout?: boolean }>(null);
  const [pressed, setPressed] = useState<Dir | null>(null);

  const answers = useRef<Answer[]>([]);
  const onset = useRef(0);
  const locked = useRef(true);
  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const finish = useCallback(
    (correct: boolean, rtMs: number, timeout = false) => {
      locked.current = true;
      clearTimers();
      answers.current.push({ correct, rtMs });
      sound.play(correct ? "correct" : "wrong");
      onProgress(answers.current.length / TOTAL);
      setFb({ correct, timeout });
      timers.current.push(
        window.setTimeout(() => {
          setFb(null);
          setPressed(null);
          if (answers.current.length >= TOTAL) {
            const a = answers.current;
            const c = a.filter((x) => x.correct).length;
            onDone({
              correct: c,
              wrong: TOTAL - c,
              total: TOTAL,
              avgMs: Math.round(a.reduce((s, x) => s + x.rtMs, 0) / a.length),
              accuracy: Math.round((c / TOTAL) * 1000) / 10,
            });
          } else {
            setIndex((i) => i + 1);
          }
        }, FEEDBACK_MS),
      );
    },
    [onDone, onProgress],
  );

  // 문제가 DOM에 그려진 직후를 응답시간 기준점으로 사용
  useLayoutEffect(() => {
    onset.current = performance.now();
  }, [index]);

  useEffect(() => {
    if (answers.current.length >= TOTAL) return;
    locked.current = false;
    timers.current.push(window.setTimeout(() => !locked.current && finish(false, TIME_LIMIT, true), TIME_LIMIT));
    return clearTimers;
  }, [index, finish]);

  const answer = useCallback(
    (d: Dir) => {
      if (locked.current) return;
      const rt = Math.round(performance.now() - onset.current);
      setPressed(d);
      finish(d === qs[index].arrow, rt);
    },
    [finish, index, qs],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft") answer("left");
      if (e.key === "ArrowRight") answer("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  const q = qs[Math.min(index, TOTAL - 1)];

  return (
    <div className="no-select flex flex-col items-center">
      <p className="mb-1 text-center text-lg font-bold">
        글자는 무시하고 <span className="text-sober">화살표 방향</span>을 누르세요!
      </p>
      <p className="mb-6 text-center text-sm text-muted">
        {Math.min(index + 1, TOTAL)} / {TOTAL} · 제한시간 2초
      </p>

      <div
        className={cn(
          "relative flex h-64 w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl border bg-surface transition-colors duration-150",
          fb == null ? "border-line" : fb.correct ? "border-good bg-good/10" : "border-bad bg-bad/10",
        )}
      >
        {/* 이전 문제가 퇴장 애니메이션으로 남아 있으면 응답시간이 왜곡되므로 즉시 교체 */}
        <motion.div
            key={index}
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
            className={cn("relative flex w-full items-center justify-center gap-3", q.wordSide === "right" && "flex-row-reverse")}
          >
            <span className="text-4xl font-black text-white">{q.word === "left" ? "왼쪽" : "오른쪽"}</span>
            {q.arrow === "left" ? (
              <ArrowBigLeft size={120} className="fill-sober text-sober drop-shadow-[0_0_24px_rgba(61,169,255,0.6)]" />
            ) : (
              <ArrowBigRight size={120} className="fill-sober text-sober drop-shadow-[0_0_24px_rgba(61,169,255,0.6)]" />
            )}
          </motion.div>

        <AnimatePresence>
          {fb && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute right-4 top-4 flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold",
                fb.correct ? "bg-good text-[#032015]" : "bg-bad text-white",
              )}
            >
              {fb.correct ? <Check size={16} /> : <X size={16} />}
              {fb.correct ? "정답" : fb.timeout ? "시간 초과" : "오답"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        {(["left", "right"] as Dir[]).map((d) => (
          <button
            key={d}
            type="button"
            data-sfx="none"
            onPointerDown={(e) => {
              e.preventDefault();
              answer(d);
            }}
            className={cn(
              "flex h-20 items-center justify-center gap-2 rounded-3xl border border-line bg-surface2 text-lg font-bold transition active:scale-95",
              pressed === d && fb && (fb.correct ? "border-good bg-good/20" : "border-bad bg-bad/20"),
            )}
          >
            {d === "left" ? (
              <>
                <ArrowBigLeft size={28} /> 왼쪽
              </>
            ) : (
              <>
                오른쪽 <ArrowBigRight size={28} />
              </>
            )}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">PC에서는 키보드 ← → 로도 답할 수 있어요</p>
    </div>
  );
}
