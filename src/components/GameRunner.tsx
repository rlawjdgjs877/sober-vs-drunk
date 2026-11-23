import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Keyboard, MousePointerClick, Zap } from "lucide-react";
import { ReactionGame } from "./games/ReactionGame";
import { ArrowGame } from "./games/ArrowGame";
import { TypingGame } from "./games/TypingGame";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import type { ArrowResult, GameResults, ReactionResult, TypingResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

const GAMES = [
  { key: "reaction", title: "반응속도", icon: Zap, rule: "초록색이면 바로 터치, 빨간색이면 참기!" },
  { key: "arrow", title: "반대로 누르기", icon: MousePointerClick, rule: "글자는 무시하고 화살표 방향을 누르기!" },
  { key: "typing", title: "타이핑", icon: Keyboard, rule: "문장 하나를 그대로 입력하기!" },
] as const;

/** 전체 플레이를 약 30초 안에 끝내기 위한 타이밍 */
const COUNT_STEP_MS = 400; // 3·2·1 각 0.4초
const AUTO_NEXT_MS = 800; // 게임 결과를 잠깐 보여준 뒤 자동으로 다음 게임

type Phase = "intro" | "countdown" | "play" | "result";

function Countdown({ onDone, tone, title, rule }: { onDone: () => void; tone: "sober" | "drunk"; title: string; rule: string }) {
  const [n, setN] = useState(3);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    sound.play(n === 0 ? "go" : "count");
  }, [n]);
  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(() => done.current(), 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((x) => x - 1), COUNT_STEP_MS);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-sm font-bold text-muted">{title}</div>
      <div className="mt-1 text-lg font-extrabold">{rule}</div>
      <div className="relative mt-6 flex h-[140px] items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={n}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className={cn("text-[110px] font-black italic leading-none", tone === "sober" ? "text-sober" : "text-drunk")}
          >
            {n === 0 ? "GO!" : n}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function MiniResult({ step, results }: { step: number; results: Partial<GameResults> }) {
  if (step === 0 && results.reaction) {
    const r = results.reaction;
    return (
      <div className="grid grid-cols-2 gap-2">
        <Stat label="평균 반응시간" value={r.avgMs != null ? `${r.avgMs}ms` : "-"} />
        <Stat label="가장 빠른 반응" value={r.bestMs != null ? `${r.bestMs}ms` : "-"} />
        <Stat label="잘못 누른 횟수" value={`${r.falseTaps}회`} />
        <Stat label="반응 못한 횟수" value={`${r.misses}회`} />
      </div>
    );
  }
  if (step === 1 && results.arrow) {
    const a = results.arrow;
    return (
      <div className="grid grid-cols-2 gap-2">
        <Stat label="정답" value={`${a.correct}개`} />
        <Stat label="오답" value={`${a.wrong}개`} />
        <Stat label="정확도" value={`${a.accuracy}%`} />
        <Stat label="평균 응답시간" value={`${a.avgMs}ms`} />
      </div>
    );
  }
  if (step === 2 && results.typing) {
    const t = results.typing;
    return (
      <div className="grid grid-cols-2 gap-2">
        <Stat label="입력 완료 시간" value={`${(t.totalTimeMs / 1000).toFixed(1)}초`} />
        <Stat label="오타율" value={`${t.errorRate}%`} />
        <Stat label="분당 타수" value={`${t.cpm}타`} />
        <Stat label="수정 / Backspace" value={`${t.corrections}회 / ${t.backspaces}회`} />
      </div>
    );
  }
  return null;
}

const ORDER: (keyof GameResults)[] = ["reaction", "arrow", "typing"];

function loadDraft(key: string): Partial<GameResults> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 게임이 하나 끝날 때마다 draftKey에 임시 저장 → 새로고침해도 끝난 게임 기록은 유지되고 다음 게임부터 이어서 진행 */
export function GameRunner({ tone, onComplete, draftKey }: { tone: "sober" | "drunk"; onComplete: (r: GameResults) => void; draftKey: string }) {
  const [results, setResults] = useState<Partial<GameResults>>(() => loadDraft(draftKey));
  const [step, setStep] = useState(() => {
    const i = ORDER.findIndex((k) => !results[k]);
    return i === -1 ? 2 : i;
  });
  const [phase, setPhase] = useState<Phase>(() => (ORDER.every((k) => results[k]) ? "result" : "intro"));
  const [inner, setInner] = useState(0);
  const game = GAMES[step];
  const resumed = step > 0 && phase === "intro";

  const overall = ((step + (phase === "result" ? 1 : inner)) / GAMES.length) * 100;

  const onProgress = useCallback((p: number) => setInner(p), []);
  const finishGame = useCallback(
    (key: keyof GameResults) => (r: ReactionResult | ArrowResult | TypingResult) => {
      setResults((prev) => {
        const nextResults = { ...prev, [key]: r };
        try {
          localStorage.setItem(draftKey, JSON.stringify(nextResults));
        } catch {
          /* 저장 공간 부족 등은 무시 */
        }
        return nextResults;
      });
      setTimeout(() => setPhase("result"), 250);
    },
    [draftKey],
  );
  const onReaction = useCallback((r: ReactionResult) => finishGame("reaction")(r), [finishGame]);
  const onArrow = useCallback((r: ArrowResult) => finishGame("arrow")(r), [finishGame]);
  const onTyping = useCallback((r: TypingResult) => finishGame("typing")(r), [finishGame]);

  const isLast = step === GAMES.length - 1;

  useEffect(() => {
    if (phase === "result") sound.play("complete");
  }, [phase]);

  // 게임 중에는 긴박한 배경음악. 단계가 올라갈수록 빨라지고, 마지막 게임이 끝나면 페이드아웃
  useEffect(() => {
    const playing = phase === "countdown" || phase === "play" || (phase === "result" && step < GAMES.length - 1);
    if (playing) sound.startBgm(step);
    else sound.stopBgm(phase === "result" ? 0.8 : 0.3);
  }, [phase, step]);
  useEffect(() => () => sound.stopBgm(0.3), []);

  // 중간 게임은 결과를 잠깐 보여주고 자동으로 다음 게임 카운트다운으로
  useEffect(() => {
    if (phase !== "result" || isLast) return;
    const t = setTimeout(() => {
      setStep((s) => s + 1);
      setInner(0);
      setPhase("countdown");
    }, AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [phase, isLast]);

  const finishAll = () => {
    localStorage.removeItem(draftKey);
    onComplete(results as GameResults);
  };

  return (
    <div>
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
          <span>
            게임 {step + 1} / {GAMES.length} · {game.title}
          </span>
          <span>{Math.round(overall)}%</span>
        </div>
        <Progress value={overall} tone={tone} />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {GAMES.map((g, i) => (
            <div
              key={g.key}
              className={cn(
                "h-1 rounded-full",
                i < step || (i === step && phase === "result") ? (tone === "sober" ? "bg-sober" : "bg-drunk") : i === step ? "bg-white/30" : "bg-white/10",
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.15 }}>
            <div className="rounded-3xl border border-line bg-surface p-5">
              <div className="text-xs font-bold text-muted">3개 게임 · 약 30초 · 시작하면 자동으로 이어져요</div>
              <ul className="mt-4 space-y-3">
                {GAMES.map((g, i) => {
                  const Icon = g.icon;
                  const done = !!results[ORDER[i]];
                  return (
                    <li key={g.key} className={cn("flex items-center gap-3", done && "opacity-40")}>
                      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tone === "sober" ? "bg-sober/15 text-sober" : "bg-drunk/15 text-drunk")}>
                        <Icon size={22} />
                      </div>
                      <div>
                        <div className="text-[15px] font-bold">
                          {i + 1}. {g.title} {done && "✓"}
                        </div>
                        <div className="text-[13px] text-muted">{g.rule}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Button variant={tone} size="lg" className="mt-5 w-full" onClick={() => setPhase("countdown")}>
              {resumed ? "이어서 시작!" : "준비됐어요, 시작!"}
            </Button>
          </motion.div>
        )}

        {phase === "countdown" && (
          <motion.div key={`cd-${step}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <Countdown tone={tone} title={`GAME ${step + 1} · ${game.title}`} rule={game.rule} onDone={() => setPhase("play")} />
          </motion.div>
        )}

        {phase === "play" && (
          <motion.div key={`play-${step}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {step === 0 && <ReactionGame onProgress={onProgress} onDone={onReaction} />}
            {step === 1 && <ArrowGame onProgress={onProgress} onDone={onArrow} />}
            {step === 2 && <TypingGame onProgress={onProgress} onDone={onTyping} />}
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key={`res-${step}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.15 }}>
            <div className="rounded-3xl border border-line bg-surface p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-good">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-good/20">✓</span>
                {game.title} 완료!
              </div>
              <div className="mt-4">
                <MiniResult step={step} results={results} />
              </div>
              {!isLast ? (
                <div className="mt-4">
                  <div className="mb-1.5 text-xs text-muted">곧 {GAMES[step + 1].title} 게임이 시작돼요</div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={cn("h-full", tone === "sober" ? "bg-sober" : "bg-drunk")}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTO_NEXT_MS / 1000, ease: "linear" }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">3개 게임을 모두 마쳤어요!</p>
              )}
            </div>
            {isLast && (
              <Button variant={tone} size="lg" className="mt-5 w-full" onClick={finishAll}>
                {tone === "drunk" ? "대결 결과 공개!" : "맨정신 기록 저장하기"} <ArrowRight size={18} />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
