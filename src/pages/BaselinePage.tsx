import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck2, CheckCircle2, Info, RotateCcw } from "lucide-react";
import { Page, TopBar } from "@/components/Shared";
import { Character } from "@/components/Character";
import { GameRunner } from "@/components/GameRunner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRecords } from "@/store/RecordsContext";
import { newId } from "@/lib/storage";
import { CURRENT_PROTOCOL, type GameResults } from "@/lib/types";
import { round } from "@/lib/utils";

const DRAFT = "sober-vs-drunk:draft:baseline";

export default function BaselinePage() {
  const nav = useNavigate();
  const { baseline, addRecord } = useRecords();
  const hasDraft = (() => {
    try {
      return !!localStorage.getItem(DRAFT);
    } catch {
      return false;
    }
  })();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [saved, setSaved] = useState<GameResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = async (r: GameResults) => {
    try {
      await addRecord({ id: newId(), protocol: CURRENT_PROTOCOL, kind: "baseline", createdAt: new Date().toISOString(), results: r });
      setSaved(r);
      setPhase("done");
      window.scrollTo(0, 0);
    } catch {
      setError("저장 공간이 부족해 기록을 저장하지 못했어요.");
    }
  };

  if (phase === "play") {
    return (
      <Page>
        <TopBar title="맨정신 기록 등록" onBack={() => setPhase("intro")} />
        <GameRunner tone="sober" draftKey={DRAFT} onComplete={complete} />
        {error && <p className="mt-4 text-center text-sm text-bad">{error}</p>}
      </Page>
    );
  }

  if (phase === "done" && saved) {
    const count = (baseline?.count ?? 1);
    const days = baseline?.distinctDays ?? 1;
    return (
      <Page>
        <TopBar title="등록 완료" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
          <div className="relative mt-2">
            <div className="absolute inset-0 rounded-full bg-sober/30 blur-3xl" />
            <Character variant="sober" mood="happy" size={140} />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">맨정신의 나, 저장 완료!</h1>
          <p className="mt-2 text-[15px] text-muted">
            지금까지 기준 기록 <b className="text-white">{count}회</b> ({days}일)
          </p>
          {count < 2 ? (
            <Badge tone="sober" className="mt-3">임시 기준 기록</Badge>
          ) : (
            <Badge tone="good" className="mt-3">기준 기록 {count}회 평균 사용 중</Badge>
          )}
        </motion.div>

        <Card className="mt-6">
          <div className="text-sm font-bold text-muted">이번 측정 결과</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ["평균 반응시간", saved.reaction.avgMs != null ? `${saved.reaction.avgMs}ms` : "-"],
              ["반응 정확도", `${saved.reaction.accuracy}%`],
              ["판단 정확도", `${saved.arrow.accuracy}%`],
              ["판단 응답시간", `${saved.arrow.avgMs}ms`],
              ["오타율", `${saved.typing.errorRate}%`],
              ["분당 타수", `${saved.typing.cpm}타`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-surface2 p-3">
                <div className="text-xs text-muted">{k}</div>
                <div className="mt-1 text-lg font-bold text-sober">{v}</div>
              </div>
            ))}
          </div>
          {baseline && count > 1 && (
            <p className="mt-3 text-xs text-muted">
              비교에는 기준 기록 {count}회의 평균을 사용해요 (평균 반응시간 {baseline.results.reaction.avgMs != null ? `${round(baseline.results.reaction.avgMs)}ms` : "-"}).
            </p>
          )}
        </Card>

        {days < 3 && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-line bg-surface/60 p-4 text-[13px] leading-relaxed text-muted">
            <CalendarCheck2 className="mt-0.5 shrink-0 text-sober" size={18} />
            <p>
              하루의 컨디션만으로는 평소 실력을 알기 어려워요. <b className="text-white">서로 다른 날 3번 이상</b> 측정하면 더 믿을 만한 기준이 만들어져요.
              (현재 {days}일)
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <Button variant="drunk" size="lg" className="w-full" onClick={() => nav("/test")}>
            지금의 나와 대결하러 가기
          </Button>
          <Button variant="secondary" size="lg" className="w-full" onClick={() => nav("/")}>
            홈으로
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <TopBar title="맨정신 기록 등록" />
      <div className="flex flex-col items-center text-center">
        <div className="relative mt-2">
          <div className="absolute inset-0 rounded-full bg-sober/25 blur-3xl" />
          <Character variant="sober" mood="smug" size={140} />
        </div>
        <h1 className="mt-4 text-[26px] font-extrabold leading-snug">
          맨정신의 나를
          <br />
          저장해볼까요?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          3가지 미니게임으로 평소의 반응속도, 판단력,
          <br />
          타이핑 실력을 측정해요. 약 30초면 끝나요.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          ["⚡", "반응속도"],
          ["🧭", "판단력"],
          ["⌨️", "타이핑"],
        ].map(([e, t], i) => (
          <div key={t} className="rounded-2xl border border-line bg-surface p-3 text-center">
            <div className="text-2xl">{e}</div>
            <div className="mt-1 text-xs font-bold text-muted">GAME {i + 1}</div>
            <div className="text-sm font-bold">{t}</div>
          </div>
        ))}
      </div>

      {baseline && (
        <Card className="mt-4 flex items-center gap-3 p-4">
          <CheckCircle2 className="shrink-0 text-sober" size={22} />
          <div className="text-sm">
            <div className="font-bold">
              기준 기록 {baseline.count}회 저장됨 {baseline.isTemporary && <Badge tone="sober" className="ml-1">임시 기준</Badge>}
            </div>
            <div className="text-muted">새로 측정하면 기존 기록과 평균을 내서 기준이 더 정확해져요.</div>
          </div>
        </Card>
      )}

      <div className="mt-4 flex gap-3 rounded-2xl border border-line bg-surface/60 p-4 text-[13px] leading-relaxed text-muted">
        <Info className="mt-0.5 shrink-0 text-sober" size={18} />
        <p>술을 마시지 않은 평소 상태에서 진행해 주세요. 조용한 곳에서, 평소 쓰는 기기로 측정하면 비교가 더 정확해요.</p>
      </div>

      <div className="mt-6 space-y-3">
        <Button variant="sober" size="lg" className="w-full" onClick={() => setPhase("play")}>
          {hasDraft ? "이어서 측정하기" : "측정 시작하기"}
        </Button>
        {hasDraft && (
          <Button
            variant="ghost"
            size="md"
            className="w-full"
            onClick={() => {
              localStorage.removeItem(DRAFT);
              setPhase("play");
            }}
          >
            <RotateCcw size={16} /> 처음부터 다시 측정
          </Button>
        )}
      </div>
    </Page>
  );
}
