import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronDown, Equal, History, Home, ImageDown, Moon, Trophy } from "lucide-react";
import { Page, SafetyNote, TopBar } from "@/components/Shared";
import { Character, type Mood } from "@/components/Character";
import { ResultRadar } from "@/components/ResultRadar";
import { ShareCardModal } from "@/components/ShareCard";
import { NextDaySheet } from "@/components/NextDayForm";
import { drinkLabel, feelingLabel } from "@/components/DrinkForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRecords } from "@/store/RecordsContext";
import { compareResults, radarData, resultMessages, type GameCompare, type MetricCompare, type Overall, type Status } from "@/lib/stats";
import { cn, formatDate } from "@/lib/utils";
import { sound } from "@/lib/sound";

export function moodsFor(overall: Overall): { sober: Mood; now: Mood } {
  if (overall === "lose") return { sober: "smug", now: "dizzy" };
  if (overall === "win") return { sober: "shocked", now: "happy" };
  return { sober: "neutral", now: "neutral" };
}

function StatusIcon({ s, size = 16 }: { s: Status; size?: number }) {
  if (s === "worse") return <ArrowDown size={size} className="text-bad" />;
  if (s === "better") return <ArrowUp size={size} className="text-good" />;
  return <Equal size={size} className="text-muted" />;
}

const statusText = { worse: "text-bad", better: "text-good", same: "text-muted" };
const outcomeBadge = {
  lose: <Badge tone="bad">맨정신 승</Badge>,
  win: <Badge tone="good">지금의 나 승</Badge>,
  draw: <Badge tone="muted">무승부</Badge>,
};
const gameEmoji = { reaction: "⚡", arrow: "🧭", typing: "⌨️" };

function Bars({ m }: { m: MetricCompare }) {
  const max = Math.max(m.sober ?? 0, m.now ?? 0, 1);
  return (
    <div className="space-y-2">
      {[
        ["맨정신", m.sober, m.soberText, "bg-sober", "text-sober"],
        ["지금의 나", m.now, m.nowText, "bg-drunk", "text-drunk"],
      ].map(([label, v, text, bar, color], i) => (
        <div key={i} className="flex items-center gap-3">
          <span className={cn("w-16 shrink-0 text-xs font-bold", color as string)}>{label as string}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className={cn("h-full rounded-full", bar as string)}
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.max(4, (((v as number) ?? 0) / max) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-sm font-bold">{text as string}</span>
        </div>
      ))}
    </div>
  );
}

function GameCard({ g, index }: { g: GameCompare; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
      <Card className="p-0">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{gameEmoji[g.game]}</span>
              <span className="text-[17px] font-extrabold">{g.title}</span>
            </div>
            {outcomeBadge[g.outcome]}
          </div>
          <div className="mt-1 text-xs text-muted">{g.headline.label}</div>
          <div className="mt-3">
            <Bars m={g.headline} />
          </div>
          <div className={cn("mt-3 flex items-center gap-1.5 text-[15px] font-bold", statusText[g.headline.status])}>
            <StatusIcon s={g.headline.status} size={18} />
            {g.headline.changeText}
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-center gap-1 border-t border-line py-3 text-xs font-semibold text-muted">
          세부 기록 {open ? "접기" : "보기"} <ChevronDown size={14} className={cn("transition", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="space-y-1 px-5 pb-5">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 pb-1 text-[11px] font-bold text-muted">
                  <span>항목</span>
                  <span className="w-14 text-right text-sober">맨정신</span>
                  <span className="w-14 text-right text-drunk">지금</span>
                </div>
                {g.metrics.map((m) => (
                  <div key={m.key} className="rounded-xl bg-surface2 px-3 py-2">
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-sm">
                      <span className="font-semibold">{m.label}</span>
                      <span className="w-14 text-right">{m.soberText}</span>
                      <span className="w-14 text-right font-bold">{m.nowText}</span>
                    </div>
                    <div className={cn("mt-0.5 flex items-center gap-1 text-xs", statusText[m.status])}>
                      <StatusIcon s={m.status} size={12} />
                      {m.changeText}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function ResultPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const fresh = sp.get("new") === "1";
  const nav = useNavigate();
  const { records, ready, updateRecord } = useRecords();
  const record = records.find((r) => r.id === id);
  const [shareOpen, setShareOpen] = useState(false);
  const [nextOpen, setNextOpen] = useState(false);

  const data = useMemo(() => {
    if (!record?.baselineSnapshot) return null;
    const games = compareResults(record.baselineSnapshot, record.results);
    const msg = resultMessages(games, record.drink?.feeling, !!record.drink?.drank);
    return { games, ...msg, radar: radarData(record.baselineSnapshot, record.results) };
  }, [record]);

  const outcomeForSound = data?.overall;
  useEffect(() => {
    if (!fresh || !outcomeForSound) return;
    // VS 등장 연출과 맞춘 효과음: 휙-쾅 → 승패 징글
    const t1 = setTimeout(() => sound.play("vs"), 350);
    const t2 = setTimeout(() => sound.play(outcomeForSound), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fresh, outcomeForSound]);

  if (!ready) return null;
  if (!record || !data) {
    return (
      <Page>
        <TopBar title="대결 결과" />
        <p className="mt-16 text-center text-muted">기록을 찾을 수 없어요.</p>
        <Button className="mt-6 w-full" onClick={() => nav("/history")}>
          기록 목록으로
        </Button>
      </Page>
    );
  }

  const { games, overall, headline, lines, radar } = data;
  const moods = moodsFor(overall);
  const soberWins = games.filter((g) => g.outcome === "lose").length;
  const nowWins = games.filter((g) => g.outcome === "win").length;
  const d = fresh ? 1 : 0; // 새 결과일 때만 등장 연출 지연

  return (
    <Page>
      <TopBar title="대결 결과" onBack={() => (fresh ? nav("/") : nav(-1))} />

      {/* VS 히어로 */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-surface to-bg px-3 pb-6 pt-5">
        <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-sober/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-drunk/20 blur-3xl" />
        <div className="relative text-center text-xs text-muted">{formatDate(record.createdAt)}</div>

        <div className="relative mt-2 flex items-end justify-between">
          <motion.div
            className="flex w-[38%] flex-col items-center"
            initial={fresh ? { x: -160, opacity: 0 } : false}
            animate={fresh ? { x: [-160, 10, 0], opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div animate={fresh ? { x: [0, 0, 14, 0] } : {}} transition={{ delay: 0.75, duration: 0.35 }}>
              <Character variant="sober" mood={moods.sober} facing="right" size={110} />
            </motion.div>
            <span className="mt-1 rounded-full bg-sober/15 px-3 py-1 text-xs font-bold text-sober">맨정신의 나</span>
          </motion.div>

          <div className="mb-14 flex flex-1 flex-col items-center">
            <motion.span
              className="text-gradient-vs text-5xl font-black italic"
              initial={fresh ? { scale: 4, opacity: 0, rotate: -25 } : false}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.6 * d, type: "spring", stiffness: 320, damping: 11 }}
            >
              VS
            </motion.span>
            {fresh && (
              <motion.div
                className="pointer-events-none absolute left-1/2 top-[40%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/50"
                initial={{ scale: 0, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ delay: 0.75, duration: 0.6 }}
              />
            )}
            <motion.div
              className="mt-2 text-2xl font-black tabular-nums"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 * d }}
            >
              <span className="text-sober">{soberWins}</span>
              <span className="mx-1.5 text-white/40">:</span>
              <span className="text-drunk">{nowWins}</span>
            </motion.div>
          </div>

          <motion.div
            className="flex w-[38%] flex-col items-center"
            initial={fresh ? { x: 160, opacity: 0 } : false}
            animate={fresh ? { x: [160, -10, 0], opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          >
            <motion.div animate={fresh ? { x: [0, 0, -14, 0] } : {}} transition={{ delay: 0.75, duration: 0.35 }}>
              <Character variant="drunk" mood={moods.now} facing="left" size={110} />
            </motion.div>
            <span className="mt-1 rounded-full bg-drunk/15 px-3 py-1 text-xs font-bold text-drunk">지금의 나</span>
          </motion.div>
        </div>

        <motion.div
          className="relative mt-5 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.35 * d, type: "spring" }}
        >
          <div
            className={cn(
              "mx-auto inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-black",
              overall === "lose" ? "bg-bad/15 text-bad" : overall === "win" ? "bg-good/15 text-good" : "bg-white/10 text-white/80",
            )}
          >
            <Trophy size={16} />
            {overall === "lose" ? "맨정신의 나 WIN" : overall === "win" ? "지금의 나 WIN" : "DRAW"}
          </div>
          <h1 className="mt-3 text-[22px] font-extrabold leading-snug">{headline}</h1>
          <div className="mt-2 space-y-1">
            {lines.map((l) => (
              <p key={l} className="text-[14px] leading-relaxed text-white/75">
                {l}
              </p>
            ))}
          </div>
        </motion.div>
      </div>

      {record.baselineCount === 1 && (
        <p className="mt-3 text-center text-xs text-muted">※ 맨정신 기록이 1회뿐인 임시 기준과 비교한 결과예요.</p>
      )}

      {/* 게임별 비교 */}
      <div className="mt-5 space-y-3">
        {games.map((g, i) => (
          <GameCard key={g.game} g={g} index={i} />
        ))}
      </div>

      {/* 레이더 */}
      <Card className="mt-5">
        <div className="text-[17px] font-extrabold">한눈에 보는 능력치</div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          단위가 다른 지표를 비교하기 위해 맨정신 기록을 100으로 놓고 정규화했어요. 100보다 작으면 평소보다 낮은 거예요. (최대 150)
        </p>
        <ResultRadar data={radar} />
        <div className="mt-1 space-y-1.5">
          {radar.map((r) => (
            <div key={r.axis} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 rounded-xl bg-surface2 px-3 py-2 text-[13px]">
              <span className="font-semibold">{r.axis}</span>
              <span className="text-sober">{r.soberRaw}</span>
              <span className="text-drunk">{r.nowRaw}</span>
              <span className={cn("w-12 text-right font-bold", r.now < 90 ? "text-bad" : r.now > 110 ? "text-good" : "text-muted")}>{r.now}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 음주 정보 */}
      <Card className="mt-5">
        <div className="text-[17px] font-extrabold">이날의 기록</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {(record.drink?.drank
            ? [
                ["술 종류", drinkLabel(record.drink.type)],
                ["마신 양", `${record.drink.volumeMl}mL · ${record.drink.abv}%`],
                ["음주 시작", record.drink.startTime ?? "-"],
                ["마신 시각", record.drink.lastTime ?? "-"],
                ["스스로 느낀 상태", feelingLabel(record.drink.feeling)],
              ]
            : [
                ["음주", "마시지 않음"],
                ["스스로 느낀 상태", feelingLabel(record.drink?.feeling ?? "fine")],
              ]
          ).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface2 p-3">
              <div className="text-xs text-muted">{k}</div>
              <div className="mt-0.5 font-bold">{v}</div>
            </div>
          ))}
        </div>
        {record.nextDay && (
          <div className="mt-3 rounded-2xl border border-drunk/20 bg-drunk/5 p-3 text-sm">
            <div className="mb-1 text-xs font-bold text-drunk">다음 날 상태</div>
            숙취 {record.nextDay.hangover}/5 · 피로도 {record.nextDay.fatigue}/5 · 기억 흐릿함 {record.nextDay.blackout ? "있음" : "없음"}
            {record.nextDay.memo && <div className="mt-1 text-muted">“{record.nextDay.memo}”</div>}
          </div>
        )}
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="sober" size="lg" onClick={() => setShareOpen(true)}>
          <ImageDown size={18} /> 결과 카드
        </Button>
        <Button variant="drunk" size="lg" onClick={() => setNextOpen(true)}>
          <Moon size={18} /> {record.nextDay ? "다음 날 수정" : "다음 날 기록"}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => nav("/history")}>
          <History size={18} /> 기록 보기
        </Button>
        <Button variant="secondary" size="lg" onClick={() => nav("/")}>
          <Home size={18} /> 홈으로
        </Button>
      </div>

      <div className="mt-6">
        <SafetyNote />
      </div>

      <ShareCardModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        record={record}
        games={games}
        overall={overall}
        headline={headline}
        soberMood={moods.sober}
        nowMood={moods.now}
      />
      <NextDaySheet open={nextOpen} initial={record.nextDay} onClose={() => setNextOpen(false)} onSave={(n) => updateRecord(record.id, { nextDay: n })} />
    </Page>
  );
}
