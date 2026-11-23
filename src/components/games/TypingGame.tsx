import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";
import type { TypingResult } from "@/lib/types";
import { pickSentences } from "@/lib/sentences";
import { editDistance, strokeCount } from "@/lib/hangul";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";
import { Button } from "@/components/ui/button";

const COUNT = 1;

type SentenceLog = {
  target: string;
  final: string;
  timeMs: number;
  finalErrors: number;
  correctedErrors: number;
  backspaces: number;
  corrections: number;
};

/**
 * 한글 IME 대응 방식
 * - 조합 중인 마지막 글자는 아직 확정되지 않았으므로 오타 판정에서 제외합니다.
 *   (예: '가'+'ㄴ' → '간' 이었다가 'ㅏ'를 치면 '가나'가 되는 도깨비불 현상)
 * - 입력 중 오타는 "확정된 글자 중 첫 번째 불일치 위치"만 기록해, 한 번의 실수가 뒤쪽 글자 전부로 번져 중복 계산되지 않게 합니다.
 * - Backspace는 beforeinput(deleteContentBackward)로 세어 모바일 키보드(keyCode 229)에서도 동작합니다.
 */
export function TypingGame({ onProgress, onDone }: { onProgress: (p: number) => void; onDone: (r: TypingResult) => void }) {
  const [targets] = useState(() => pickSentences(COUNT));
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [composing, setComposing] = useState(false);
  const [completedFlash, setCompletedFlash] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logs = useRef<SentenceLog[]>([]);
  const startAt = useRef<number | null>(null);
  const everWrong = useRef<Set<number>>(new Set());
  const bs = useRef(0);
  const corr = useRef(0);
  const lastWasDelete = useRef(false);
  const composingRef = useRef(false);
  const doneRef = useRef(false);
  const advancingRef = useRef(false); // 같은 문장이 두 번 제출되지 않도록
  const target = targets[idx];

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [idx]);

  // native beforeinput: Backspace/수정 횟수 기록
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onBefore = (e: InputEvent) => {
      if (startAt.current == null) startAt.current = performance.now();
      if (e.inputType.startsWith("delete")) {
        bs.current += 1;
        // 조합 중 자모 지우기는 '수정'이 아님. 확정된 글자를 지우기 시작한 순간을 1회 수정으로 계산
        if (!e.isComposing && !composingRef.current && !lastWasDelete.current) corr.current += 1;
        lastWasDelete.current = true;
      } else {
        lastWasDelete.current = false;
      }
    };
    el.addEventListener("beforeinput", onBefore as EventListener);
    return () => el.removeEventListener("beforeinput", onBefore as EventListener);
  }, []);

  const trackErrors = (v: string) => {
    // 마지막 글자(조합 중일 수 있음)는 제외하고 확정 구간만 검사
    const committed = Math.max(0, v.length - 1);
    for (let i = 0; i < committed; i++) {
      if (v[i] !== target[i]) {
        everWrong.current.add(i);
        break; // 첫 번째 불일치만
      }
    }
  };

  const completeSentence = (finalText: string) => {
    if (doneRef.current || advancingRef.current) return;
    advancingRef.current = true;
    const end = performance.now();
    const timeMs = startAt.current == null ? 0 : end - startAt.current;
    const finalErrors = Math.min(editDistance(finalText, target), target.length);
    let correctedErrors = 0;
    everWrong.current.forEach((i) => {
      if (finalText[i] === target[i]) correctedErrors += 1;
    });
    logs.current.push({
      target,
      final: finalText,
      timeMs,
      finalErrors,
      correctedErrors,
      backspaces: bs.current,
      corrections: corr.current,
    });
    onProgress(logs.current.length / COUNT);

    // 다음 문장 준비
    startAt.current = null;
    everWrong.current = new Set();
    bs.current = 0;
    corr.current = 0;
    lastWasDelete.current = false;

    if (logs.current.length >= COUNT) {
      doneRef.current = true;
      const L = logs.current;
      const totalTime = L.reduce((a, l) => a + l.timeMs, 0);
      const totalTarget = L.reduce((a, l) => a + l.target.length, 0);
      const totalErr = L.reduce((a, l) => a + l.finalErrors + l.correctedErrors, 0);
      const strokes = L.reduce((a, l) => a + strokeCount(l.final), 0);
      onDone({
        totalTimeMs: Math.round(totalTime),
        errorRate: Math.round(Math.min(100, (totalErr / totalTarget) * 100) * 10) / 10,
        corrections: L.reduce((a, l) => a + l.corrections, 0),
        backspaces: L.reduce((a, l) => a + l.backspaces, 0),
        cpm: totalTime > 0 ? Math.round(strokes / (totalTime / 60000)) : 0,
        sentences: L.length,
      });
    } else {
      setCompletedFlash(true);
      setTimeout(() => {
        setCompletedFlash(false);
        setValue("");
        advancingRef.current = false;
        setIdx((i) => i + 1);
      }, 250);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (completedFlash || doneRef.current) return;
    const v = e.target.value;
    if (startAt.current == null && v.length > 0) startAt.current = performance.now();
    if (v.length !== value.length || v !== value) sound.play("key");
    setValue(v);
    trackErrors(v);
    if (v === target && !composingRef.current) completeSentence(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.nativeEvent.isComposing || composingRef.current) return;
      if (value.trim().length > 0 && !completedFlash) completeSentence(value);
    }
  };

  const committedLen = composing ? Math.max(0, value.length - 1) : value.length;

  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-center text-lg font-bold">아래 문장을 그대로 입력하세요</p>
      <p className="mb-5 text-center text-sm text-muted">
        다 맞게 치면 자동으로 끝나요 · Enter로 바로 제출
      </p>

      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full rounded-3xl border bg-surface p-5 text-center text-[20px] font-semibold leading-relaxed tracking-tight transition-colors",
          completedFlash ? "border-good bg-good/10" : "border-line",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {Array.from(target).map((ch, i) => {
          const typed = value[i];
          const isCurrent = i === value.length || (composing && i === value.length - 1);
          let cls = "text-white/40";
          if (i < committedLen) cls = typed === ch ? "text-sober" : "text-bad underline decoration-bad decoration-2 underline-offset-4";
          else if (composing && i === value.length - 1) cls = "text-white";
          return (
            <span key={i} className={cn(cls, isCurrent && "rounded bg-white/10")}>
              {ch === " " ? " " : ch}
            </span>
          );
        })}
      </motion.div>

      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onCompositionStart={() => {
          composingRef.current = true;
          setComposing(true);
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          setComposing(false);
          const v = (e.target as HTMLInputElement).value;
          trackErrors(v + " "); // 조합이 끝난 글자까지 확정 구간으로 검사
          if (v === target) completeSentence(v);
        }}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        type="text"
        inputMode="text"
        lang="ko"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="next"
        placeholder="여기를 눌러 입력을 시작하세요"
        className="mt-5 h-14 w-full rounded-2xl border border-line bg-surface2 px-4 text-[17px] text-white placeholder:text-white/30 outline-none focus:border-sober focus:ring-2 focus:ring-sober/30"
        aria-label="타이핑 입력"
      />

      <div className="mt-4 flex w-full items-center justify-between text-xs text-muted">
        <span>{value.length} / {target.length}자</span>
        <Button size="sm" variant="secondary" onClick={() => value.trim() && completeSentence(value)} disabled={!value.trim() || completedFlash}>
          <CornerDownLeft size={14} /> 이대로 제출
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">붙여넣기는 막혀 있어요. 틀린 글자를 고친 경우도 오타율에 반영돼요.</p>
    </div>
  );
}
