import { CURRENT_PROTOCOL, type GameResults, type SessionRecord, type Feeling } from "./types";
import { dayKey, round } from "./utils";

// ───────── 기준(맨정신) 집계 ─────────

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const meanOrNull = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => typeof x === "number");
  return v.length ? mean(v) : null;
};

export function averageResults(list: GameResults[]): GameResults | null {
  if (!list.length) return null;
  const r = list.map((x) => x.reaction);
  const a = list.map((x) => x.arrow);
  const t = list.map((x) => x.typing);
  return {
    reaction: {
      avgMs: meanOrNull(r.map((x) => x.avgMs)),
      bestMs: meanOrNull(r.map((x) => x.bestMs)),
      falseTaps: mean(r.map((x) => x.falseTaps)),
      misses: mean(r.map((x) => x.misses)),
      hits: mean(r.map((x) => x.hits)),
      totalTrials: mean(r.map((x) => x.totalTrials)),
      accuracy: mean(r.map((x) => x.accuracy)),
      trials: [],
    },
    arrow: {
      correct: mean(a.map((x) => x.correct)),
      wrong: mean(a.map((x) => x.wrong)),
      total: mean(a.map((x) => x.total)),
      avgMs: mean(a.map((x) => x.avgMs)),
      accuracy: mean(a.map((x) => x.accuracy)),
    },
    typing: {
      totalTimeMs: mean(t.map((x) => x.totalTimeMs)),
      errorRate: mean(t.map((x) => x.errorRate)),
      corrections: mean(t.map((x) => x.corrections)),
      backspaces: mean(t.map((x) => x.backspaces)),
      cpm: mean(t.map((x) => x.cpm)),
      sentences: mean(t.map((x) => x.sentences)),
    },
  };
}

export type BaselineInfo = {
  results: GameResults;
  count: number;
  distinctDays: number;
  isTemporary: boolean;
};

export function computeBaseline(records: SessionRecord[]): BaselineInfo | null {
  const base = records.filter((r) => r.kind === "baseline" && (r.protocol ?? 1) === CURRENT_PROTOCOL);
  const avg = averageResults(base.map((b) => b.results));
  if (!avg) return null;
  const distinctDays = new Set(base.map((b) => dayKey(b.createdAt))).size;
  return { results: avg, count: base.length, distinctDays, isTemporary: base.length < 2 };
}

// ───────── 비교 ─────────

export type Status = "better" | "worse" | "same";
export type GameKey = "reaction" | "arrow" | "typing";

export type MetricCompare = {
  key: string;
  label: string;
  sober: number | null;
  now: number | null;
  soberText: string;
  nowText: string;
  changeText: string;
  status: Status;
};

export type GameCompare = {
  game: GameKey;
  title: string;
  outcome: "win" | "lose" | "draw"; // 지금의 나 기준
  headline: MetricCompare;
  metrics: MetricCompare[];
};

const fmtMs = (v: number | null) => (v == null ? "-" : `${Math.round(v)}ms`);
const fmtPct = (v: number | null) => (v == null ? "-" : `${round(v, 1)}%`);
const fmtCount = (v: number | null) => (v == null ? "-" : `${round(v, 1)}회`);
const fmtCpm = (v: number | null) => (v == null ? "-" : `${Math.round(v)}타`);
const fmtSec = (v: number | null) => (v == null ? "-" : `${round(v / 1000, 1)}초`);

/** 낮을수록 좋은 시간 지표 (±10% 이내는 비슷) */
function cmpTime(key: string, label: string, s: number | null, n: number | null, fmt = fmtMs): MetricCompare {
  if (s == null || n == null || s <= 0) {
    return { key, label, sober: s, now: n, soberText: fmt(s), nowText: fmt(n), changeText: "비교할 기록이 없어요", status: "same" };
  }
  const pct = ((n - s) / s) * 100;
  const status: Status = pct > 10 ? "worse" : pct < -10 ? "better" : "same";
  const changeText =
    Math.abs(pct) < 1 ? "평소와 거의 같음" : pct > 0 ? `평소보다 ${Math.round(pct)}% 느려짐` : `평소보다 ${Math.round(-pct)}% 빨라짐`;
  return { key, label, sober: s, now: n, soberText: fmt(s), nowText: fmt(n), changeText, status };
}

/** 높을수록 좋은 % 지표 (±5%p 이내는 비슷) */
function cmpAcc(key: string, label: string, s: number, n: number, name = "정확도"): MetricCompare {
  const d = n - s;
  const status: Status = d < -5 ? "worse" : d > 5 ? "better" : "same";
  const changeText = Math.abs(d) < 0.5 ? `${name} 동일` : `${name} ${round(Math.abs(d), 1)}%p ${d < 0 ? "감소" : "증가"}`;
  return { key, label, sober: s, now: n, soberText: fmtPct(s), nowText: fmtPct(n), changeText, status };
}

/** 오타율: 배수 표현 */
function cmpErrorRate(s: number, n: number): MetricCompare {
  const base = { key: "errorRate", label: "오타율", sober: s, now: n, soberText: fmtPct(s), nowText: fmtPct(n) };
  const d = n - s;
  const status: Status = d > 2 ? "worse" : d < -2 ? "better" : "same";
  let changeText: string;
  if (s < 0.5) {
    changeText = n < 0.5 ? "오타 없이 유지" : `평소 거의 0% → ${round(n, 1)}%`;
  } else if (n / s >= 1.5) {
    changeText = `평소보다 오타율 ${round(n / s, 1)}배 증가`;
  } else if (Math.abs(d) < 0.5) {
    changeText = "평소와 거의 같음";
  } else {
    changeText = `오타율 ${round(Math.abs(d), 1)}%p ${d > 0 ? "증가" : "감소"}`;
  }
  return { ...base, changeText, status };
}

/** 높을수록 좋은 속도 (±10%) */
function cmpSpeed(s: number, n: number): MetricCompare {
  const base = { key: "cpm", label: "분당 타수", sober: s, now: n, soberText: fmtCpm(s), nowText: fmtCpm(n) };
  if (s <= 0) return { ...base, changeText: "비교할 기록이 없어요", status: "same" };
  const pct = ((n - s) / s) * 100;
  const status: Status = pct < -10 ? "worse" : pct > 10 ? "better" : "same";
  const changeText = Math.abs(pct) < 1 ? "평소와 거의 같음" : `평소보다 ${Math.round(Math.abs(pct))}% ${pct < 0 ? "느려짐" : "빨라짐"}`;
  return { ...base, changeText, status };
}

/** 낮을수록 좋은 횟수 */
function cmpCount(key: string, label: string, s: number, n: number): MetricCompare {
  const d = n - s;
  const status: Status = d >= 1 ? "worse" : d <= -1 ? "better" : "same";
  const changeText = Math.abs(d) < 0.5 ? "평소와 비슷" : `평소보다 ${round(Math.abs(d), 1)}회 ${d > 0 ? "많음" : "적음"}`;
  return { key, label, sober: s, now: n, soberText: fmtCount(s), nowText: fmtCount(n), changeText, status };
}

const score = (s: Status) => (s === "better" ? 1 : s === "worse" ? -1 : 0);
const outcomeOf = (ms: MetricCompare[]) => {
  const t = ms.reduce((a, m) => a + score(m.status), 0);
  return t > 0 ? "win" : t < 0 ? "lose" : "draw";
};

export function compareResults(sober: GameResults, now: GameResults): GameCompare[] {
  const rAvg = cmpTime("avgMs", "평균 반응시간", sober.reaction.avgMs, now.reaction.avgMs);
  const rAcc = cmpAcc("rAcc", "올바른 반응 비율", sober.reaction.accuracy, now.reaction.accuracy);
  const reaction: GameCompare = {
    game: "reaction",
    title: "반응속도 대결",
    headline: rAvg,
    outcome: outcomeOf([rAvg, rAcc]),
    metrics: [
      rAvg,
      cmpTime("bestMs", "가장 빠른 반응", sober.reaction.bestMs, now.reaction.bestMs),
      cmpCount("falseTaps", "잘못 누른 횟수", sober.reaction.falseTaps, now.reaction.falseTaps),
      cmpCount("misses", "반응 못한 횟수", sober.reaction.misses, now.reaction.misses),
    ],
  };

  const aAcc = cmpAcc("aAcc", "정확도", sober.arrow.accuracy, now.arrow.accuracy);
  const aMs = cmpTime("aMs", "평균 응답시간", sober.arrow.avgMs, now.arrow.avgMs);
  const arrow: GameCompare = {
    game: "arrow",
    title: "판단력 대결",
    headline: aAcc,
    outcome: outcomeOf([aAcc, aMs]),
    metrics: [aAcc, aMs, cmpCount("aWrong", "오답 수", sober.arrow.wrong, now.arrow.wrong)],
  };

  const tErr = cmpErrorRate(sober.typing.errorRate, now.typing.errorRate);
  const tCpm = cmpSpeed(sober.typing.cpm, now.typing.cpm);
  const typing: GameCompare = {
    game: "typing",
    title: "타이핑 대결",
    headline: tErr,
    outcome: outcomeOf([tErr, tCpm]),
    metrics: [
      tErr,
      tCpm,
      cmpTime("tTime", "입력 완료 시간", sober.typing.totalTimeMs, now.typing.totalTimeMs, fmtSec),
      cmpCount("corr", "수정 횟수", sober.typing.corrections, now.typing.corrections),
      cmpCount("bs", "Backspace", sober.typing.backspaces, now.typing.backspaces),
    ],
  };
  return [reaction, arrow, typing];
}

export type Overall = "win" | "lose" | "draw";

export function overallOutcome(games: GameCompare[]): Overall {
  const w = games.filter((g) => g.outcome === "win").length;
  const l = games.filter((g) => g.outcome === "lose").length;
  return w > l ? "win" : l > w ? "lose" : "draw";
}

// ───────── 결과 문구 (측정값 기반, 무작위 없음) ─────────

export function resultMessages(games: GameCompare[], feeling: Feeling | undefined, drank: boolean) {
  const overall = overallOutcome(games);
  const [reaction, arrow, typing] = games;
  const lines: string[] = [];

  let headline: string;
  if (overall === "lose") headline = "오늘의 내가 평소의 나에게 패배했어요!";
  else if (overall === "win") headline = "오늘의 내가 평소의 나를 이겼어요!";
  else headline = "오늘은 평소 기록과 비슷한 결과를 보였어요!";

  const worseCount = games.reduce((a, g) => a + g.metrics.filter((m) => m.status === "worse").length, 0);
  if (drank && feeling === "fine" && (overall === "lose" || worseCount >= 3)) {
    lines.push(
      typing.outcome === "lose"
        ? "본인은 멀쩡하다고 주장 중... 하지만 손가락은 다른 생각!"
        : "본인은 멀쩡하다고 주장 중... 하지만 기록은 다른 이야기를 해요!",
    );
  }

  const rAvg = reaction.headline;
  if (rAvg.status === "worse" && rAvg.sober && rAvg.now) {
    lines.push(`반응속도가 평소보다 ${Math.round(((rAvg.now - rAvg.sober) / rAvg.sober) * 100)}% 느려졌어요!`);
  } else if (rAvg.status === "better") {
    lines.push("반응속도는 오히려 평소보다 빨랐어요.");
  }

  const fts = reaction.metrics.find((m) => m.key === "falseTaps")!;
  if (fts.status === "worse") lines.push("빨간불에도 손이 먼저 나갔어요. 참을성이 살짝 줄었네요!");

  if (arrow.headline.status === "worse") lines.push("글자에 속아 반대 방향을 누른 횟수가 늘었어요.");

  const err = typing.headline;
  if (err.status === "worse") {
    if (err.sober != null && err.now != null && err.sober >= 0.5 && err.now / err.sober >= 1.5) {
      lines.push(`오타가 평소보다 ${round(err.now / err.sober, 1)}배 늘어났어요!`);
    } else {
      lines.push("오타가 평소보다 늘어났어요!");
    }
  }

  if (!lines.length && overall === "draw") lines.push("세 종목 모두 평소 범위 안이에요.");
  if (overall === "win") lines.push("컨디션이나 연습 효과일 수도 있어요. 오늘 기록이 좋다고 더 마셔도 된다는 뜻은 아니에요.");

  return { overall, headline, lines };
}

// ───────── 레이더 차트용 정규화 ─────────

export type RadarDatum = { axis: string; sober: number; now: number; soberRaw: string; nowRaw: string };

const clamp = (v: number) => Math.max(0, Math.min(150, v));
const lowerBetter = (s: number | null, n: number | null) => (s && n ? clamp((s / n) * 100) : 100);
const higherBetter = (s: number, n: number) => (s > 0 ? clamp((n / s) * 100) : n > 0 ? 150 : 100);

/** 맨정신 = 100 기준. 100보다 크면 평소보다 좋음, 작으면 평소보다 낮음 */
export function radarData(s: GameResults, n: GameResults): RadarDatum[] {
  return [
    { axis: "반응 속도", sober: 100, now: lowerBetter(s.reaction.avgMs, n.reaction.avgMs), soberRaw: fmtMs(s.reaction.avgMs), nowRaw: fmtMs(n.reaction.avgMs) },
    { axis: "반응 정확도", sober: 100, now: higherBetter(s.reaction.accuracy, n.reaction.accuracy), soberRaw: fmtPct(s.reaction.accuracy), nowRaw: fmtPct(n.reaction.accuracy) },
    { axis: "판단 정확도", sober: 100, now: higherBetter(s.arrow.accuracy, n.arrow.accuracy), soberRaw: fmtPct(s.arrow.accuracy), nowRaw: fmtPct(n.arrow.accuracy) },
    { axis: "판단 속도", sober: 100, now: lowerBetter(s.arrow.avgMs, n.arrow.avgMs), soberRaw: fmtMs(s.arrow.avgMs), nowRaw: fmtMs(n.arrow.avgMs) },
    { axis: "타이핑 정확도", sober: 100, now: higherBetter(100 - s.typing.errorRate, 100 - n.typing.errorRate), soberRaw: `오타 ${fmtPct(s.typing.errorRate)}`, nowRaw: `오타 ${fmtPct(n.typing.errorRate)}` },
    { axis: "타이핑 속도", sober: 100, now: higherBetter(s.typing.cpm, n.typing.cpm), soberRaw: fmtCpm(s.typing.cpm), nowRaw: fmtCpm(n.typing.cpm) },
  ].map((d) => ({ ...d, now: Math.round(d.now) }));
}

// ───────── 기록 패턴 분석 ─────────

export function patternInsights(tests: SessionRecord[]): string[] | null {
  const valid = tests.filter((t) => t.baselineSnapshot);
  if (valid.length < 3) return null;
  const recent = valid.slice(-3);
  const cmps = recent.map((t) => compareResults(t.baselineSnapshot!, t.results));
  const count = (game: number) => cmps.filter((c) => c[game].headline.status === "worse").length;
  const out: string[] = [];
  const names = [
    ["반응속도가 느린", "반응속도"],
    ["판단 정확도가 낮은", "판단 정확도"],
    ["오타율이 높은", "오타율"],
  ];
  names.forEach(([phrase, label], i) => {
    const c = count(i);
    if (c >= 2) out.push(`최근 3번의 기록에서 평소보다 ${phrase} 경우가 많았어요. (${c}/3회)`);
    else if (c === 0) out.push(`최근 3번의 기록에서 ${label}은(는) 평소 범위를 유지했어요.`);
  });
  const fineButWorse = recent.filter((t, i) => t.drink?.drank && t.drink.feeling === "fine" && overallOutcome(cmps[i]) === "lose").length;
  if (fineButWorse >= 2) out.push("‘멀쩡함’이라고 느꼈던 날에도 기록이 평소보다 낮았던 경우가 있었어요.");
  if (!out.length) out.push("최근 기록에서 뚜렷하게 반복되는 변화는 보이지 않아요.");
  return out;
}
