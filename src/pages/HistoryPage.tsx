import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { BarChart3, Brain, ChevronRight, Lightbulb, Moon, Swords, Trash2 } from "lucide-react";
import { Page, TopBar } from "@/components/Shared";
import { Character } from "@/components/Character";
import { NextDaySheet } from "@/components/NextDayForm";
import { drinkLabel, feelingLabel, DRINKS, FEELINGS } from "@/components/DrinkForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRecords } from "@/store/RecordsContext";
import { compareResults, overallOutcome, patternInsights } from "@/lib/stats";
import { CURRENT_PROTOCOL, type SessionRecord } from "@/lib/types";
import { cn, formatDate, formatShortDate, round } from "@/lib/utils";

type ChartDef = {
  key: string;
  title: string;
  unit: string;
  now: (r: SessionRecord) => number | null;
  base: (r: SessionRecord) => number | null;
  hint: string;
};

const CHARTS: ChartDef[] = [
  { key: "rt", title: "반응속도 변화", unit: "ms", now: (r) => r.results.reaction.avgMs, base: (r) => r.baselineSnapshot?.reaction.avgMs ?? null, hint: "낮을수록 빨라요" },
  { key: "acc", title: "판단력 정확도 변화", unit: "%", now: (r) => r.results.arrow.accuracy, base: (r) => r.baselineSnapshot?.arrow.accuracy ?? null, hint: "높을수록 정확해요" },
  { key: "err", title: "타이핑 오타율 변화", unit: "%", now: (r) => r.results.typing.errorRate, base: (r) => r.baselineSnapshot?.typing.errorRate ?? null, hint: "낮을수록 정확해요" },
];

function TrendChart({ def, tests }: { def: ChartDef; tests: SessionRecord[] }) {
  const data = tests.map((t, i) => ({
    name: `${formatShortDate(t.createdAt)}${tests.filter((x) => formatShortDate(x.createdAt) === formatShortDate(t.createdAt)).length > 1 ? `#${i + 1}` : ""}`,
    지금: def.now(t) != null ? round(def.now(t)!, 1) : null,
    맨정신: def.base(t) != null ? round(def.base(t)!, 1) : null,
  }));
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[15px] font-extrabold">{def.title}</div>
        <div className="text-[11px] text-muted">
          {def.hint} · 단위 {def.unit}
        </div>
      </div>
      <div className="mt-2 h-44">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#1E2643" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#8B93B0", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8B93B0", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#161D35", border: "1px solid #232B47", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#fff", fontWeight: 700 }}
              formatter={(v: number) => `${v}${def.unit}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
            <Line type="monotone" dataKey="맨정신" stroke="#3DA9FF" strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="지금" stroke="#FF8A3D" strokeWidth={2.5} dot={{ r: 4, fill: "#FF8A3D" }} activeDot={{ r: 6 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function CompareTwo({ tests }: { tests: SessionRecord[] }) {
  const [a, setA] = useState(tests.length >= 2 ? tests[tests.length - 2].id : tests[0]?.id);
  const [b, setB] = useState(tests[tests.length - 1]?.id);
  const ra = tests.find((t) => t.id === a);
  const rb = tests.find((t) => t.id === b);
  if (tests.length < 2) return null;
  const rows: [string, (r: SessionRecord) => string][] = [
    ["평균 반응시간", (r) => (r.results.reaction.avgMs != null ? `${r.results.reaction.avgMs}ms` : "-")],
    ["잘못 누른 횟수", (r) => `${r.results.reaction.falseTaps}회`],
    ["판단 정확도", (r) => `${r.results.arrow.accuracy}%`],
    ["판단 응답시간", (r) => `${r.results.arrow.avgMs}ms`],
    ["오타율", (r) => `${r.results.typing.errorRate}%`],
    ["분당 타수", (r) => `${r.results.typing.cpm}타`],
    ["술 / 양", (r) => (r.drink?.drank ? `${drinkLabel(r.drink.type)} ${r.drink.volumeMl}mL` : "안 마심")],
    ["느낀 상태", (r) => feelingLabel(r.drink?.feeling ?? "fine")],
  ];
  const sel = "h-10 w-full rounded-xl border border-line bg-surface2 px-2 text-[13px] text-white outline-none";
  return (
    <Card>
      <div className="text-[17px] font-extrabold">과거 기록 vs 현재 기록</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select className={sel} value={a} onChange={(e) => setA(e.target.value)} aria-label="비교 기록 1">
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {formatDate(t.createdAt)}
            </option>
          ))}
        </select>
        <select className={sel} value={b} onChange={(e) => setB(e.target.value)} aria-label="비교 기록 2">
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {formatDate(t.createdAt)}
            </option>
          ))}
        </select>
      </div>
      {ra && rb && (
        <div className="mt-3 space-y-1">
          {rows.map(([label, f]) => (
            <div key={label} className="grid grid-cols-[1fr_1fr_1fr] items-center rounded-xl bg-surface2 px-3 py-2 text-[13px]">
              <span className="text-muted">{label}</span>
              <span className="text-center font-semibold">{f(ra)}</span>
              <span className="text-center font-semibold">{f(rb)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function HistoryPage() {
  const nav = useNavigate();
  const { records, tests, baseline, removeRecord, updateRecord, clearAll, ready } = useRecords();
  const [nextFor, setNextFor] = useState<SessionRecord | null>(null);
  const [showBase, setShowBase] = useState(false);
  const insights = useMemo(() => patternInsights(tests), [tests]);
  const baselines = records.filter((r) => r.kind === "baseline");

  if (!ready) return null;

  const grouped = [...tests].reverse().reduce<Record<string, SessionRecord[]>>((acc, t) => {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    (acc[key] ||= []).push(t);
    return acc;
  }, {});

  const drinkStats = DRINKS.map((d) => ({ ...d, n: tests.filter((t) => t.drink?.drank && t.drink.type === d.type).length })).filter((d) => d.n > 0);
  const feelStats = FEELINGS.map((f) => ({ ...f, n: tests.filter((t) => t.drink?.feeling === f.value).length }));

  return (
    <Page>
      <TopBar title="나의 대결 기록" />

      <div className="grid grid-cols-3 gap-2">
        {[
          ["대결", `${tests.length}회`, "text-drunk"],
          ["맨정신 기준", `${baselines.length}회`, "text-sober"],
          ["다음 날 기록", `${tests.filter((t) => t.nextDay).length}회`, "text-white"],
        ].map(([k, v, c]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-3 text-center">
            <div className="text-[11px] text-muted">{k}</div>
            <div className={cn("mt-0.5 text-xl font-extrabold", c)}>{v}</div>
          </div>
        ))}
      </div>

      {tests.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <Character variant="drunk" mood="sad" size={120} />
          <p className="mt-4 font-bold">아직 대결 기록이 없어요</p>
          <p className="mt-1 text-sm text-muted">{baseline ? "지금의 나 테스트로 첫 대결을 시작해 보세요." : "먼저 맨정신 기록을 등록해 주세요."}</p>
          <Button variant={baseline ? "drunk" : "sober"} size="lg" className="mt-6 w-full" onClick={() => nav(baseline ? "/test" : "/baseline")}>
            {baseline ? (
              <>
                <Swords size={18} /> 지금의 나 테스트하기
              </>
            ) : (
              <>
                <Brain size={18} /> 맨정신 기록 등록하기
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* 개인 패턴 */}
          <Card className="mt-4">
            <div className="flex items-center gap-2 text-[17px] font-extrabold">
              <Lightbulb size={18} className="text-drunk" /> 나의 패턴
            </div>
            {insights ? (
              <ul className="mt-3 space-y-2">
                {insights.map((s) => (
                  <li key={s} className="rounded-xl bg-surface2 px-3 py-2.5 text-sm leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl bg-surface2 px-3 py-3 text-sm text-muted">
                아직 분석할 기록이 부족해요. 대결 기록이 3회 이상 쌓이면 패턴을 알려드릴게요. (현재 {tests.length}회)
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted">기록 횟수가 적어 통계적 결론이 아닌 참고용 관찰이에요.</p>
          </Card>

          {/* 그래프 */}
          <div className="mt-5 flex items-center gap-2 text-[17px] font-extrabold">
            <BarChart3 size={18} className="text-sober" /> 변화 그래프
          </div>
          <div className="mt-3 space-y-3">
            {CHARTS.map((c) => (
              <TrendChart key={c.key} def={c} tests={tests} />
            ))}
          </div>

          {/* 음주/상태 통계 */}
          <Card className="mt-5">
            <div className="text-[17px] font-extrabold">술 종류 · 느낀 상태</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {drinkStats.length ? (
                drinkStats.map((d) => (
                  <span key={d.type} className="rounded-full border border-line bg-surface2 px-3 py-1.5 text-sm">
                    {d.emoji} {d.label} <b className="text-drunk">{d.n}</b>
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">술을 마신 기록이 없어요</span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {feelStats.map((f) => (
                <div key={f.value} className="rounded-2xl bg-surface2 p-3 text-center">
                  <div className="text-xl">{f.emoji}</div>
                  <div className="text-xs text-muted">{f.label}</div>
                  <div className="font-bold">{f.n}회</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-5">
            <CompareTwo tests={tests} />
          </div>

          {/* 날짜별 목록 */}
          <div className="mt-6 text-[17px] font-extrabold">날짜별 기록</div>
          <div className="mt-3 space-y-5">
            {Object.entries(grouped).map(([date, list]) => (
              <div key={date}>
                <div className="mb-2 text-xs font-bold text-muted">{date}</div>
                <div className="space-y-2">
                  {list.map((t) => {
                    const games = t.baselineSnapshot ? compareResults(t.baselineSnapshot, t.results) : null;
                    const ov = games ? overallOutcome(games) : "draw";
                    return (
                      <motion.div key={t.id} layout className="rounded-3xl border border-line bg-surface p-4">
                        <button className="flex w-full items-start gap-3 text-left" onClick={() => nav(`/result/${t.id}`)}>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold">{formatDate(t.createdAt).split(" ").slice(2).join(" ")}</span>
                              {ov === "lose" ? <Badge tone="bad">맨정신 승</Badge> : ov === "win" ? <Badge tone="good">지금의 나 승</Badge> : <Badge>무승부</Badge>}
                              <Badge tone="drunk">{feelingLabel(t.drink?.feeling ?? "fine")}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              {t.drink?.drank ? `${drinkLabel(t.drink.type)} ${t.drink.volumeMl}mL · ${t.drink.abv}% · ${t.drink.startTime}~${t.drink.lastTime}` : "마시지 않음"}
                            </div>
                            {games && (
                              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                                {games.map((g) => (
                                  <div key={g.game} className="rounded-lg bg-surface2 px-2 py-1.5">
                                    <div className="text-muted">{g.title.replace(" 대결", "")}</div>
                                    <div className={cn("font-bold", g.headline.status === "worse" ? "text-bad" : g.headline.status === "better" ? "text-good" : "text-white/80")}>
                                      {g.headline.nowText}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronRight size={18} className="mt-1 text-white/30" />
                        </button>
                        {t.nextDay && (
                          <div className="mt-2 rounded-xl bg-drunk/5 px-3 py-2 text-xs text-white/80">
                            🌙 숙취 {t.nextDay.hangover}/5 · 피로 {t.nextDay.fatigue}/5 · 기억 흐릿함 {t.nextDay.blackout ? "있음" : "없음"}
                            {t.nextDay.memo && <span className="text-muted"> · {t.nextDay.memo}</span>}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="secondary" className="flex-1" onClick={() => setNextFor(t)}>
                            <Moon size={14} /> {t.nextDay ? "다음 날 수정" : "다음 날 상태 기록"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="기록 삭제"
                            onClick={() => confirm("이 대결 기록을 삭제할까요? 되돌릴 수 없어요.") && removeRecord(t.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 맨정신 기준 기록 관리 */}
      {baselines.length > 0 && (
        <Card className="mt-6">
          <button className="flex w-full items-center justify-between" onClick={() => setShowBase(!showBase)}>
            <span className="text-[15px] font-extrabold">맨정신 기준 기록 ({baselines.length}회)</span>
            <ChevronRight size={18} className={cn("text-white/40 transition", showBase && "rotate-90")} />
          </button>
          {showBase && (
            <div className="mt-3 space-y-2">
              {baselines.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-surface2 px-3 py-2 text-[13px]">
                  <div>
                    <div className="font-semibold">
                      {formatDate(b.createdAt)} {(b.protocol ?? 1) !== CURRENT_PROTOCOL && <Badge className="ml-1">이전 방식 · 기준 미사용</Badge>}
                    </div>
                    <div className="text-muted">
                      반응 {b.results.reaction.avgMs ?? "-"}ms · 판단 {b.results.arrow.accuracy}% · 오타 {b.results.typing.errorRate}%
                    </div>
                  </div>
                  <button
                    className="p-2 text-muted hover:text-bad"
                    aria-label="기준 기록 삭제"
                    onClick={() => confirm("이 맨정신 기록을 삭제할까요? 이후 비교 기준이 바뀌어요.") && removeRecord(b.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-muted">이미 끝난 대결 결과는 당시 기준으로 저장되어 바뀌지 않아요.</p>
            </div>
          )}
        </Card>
      )}

      {records.length > 0 && (
        <Button
          variant="danger"
          size="md"
          className="mt-6 w-full"
          onClick={() => confirm("모든 기록(맨정신 기준 포함)을 삭제할까요? 되돌릴 수 없어요.") && clearAll()}
        >
          <Trash2 size={16} /> 전체 기록 초기화
        </Button>
      )}

      <NextDaySheet
        open={!!nextFor}
        initial={nextFor?.nextDay}
        onClose={() => setNextFor(null)}
        onSave={async (n) => {
          if (nextFor) await updateRecord(nextFor.id, { nextDay: n });
        }}
      />
    </Page>
  );
}
