// ───────────────────────────────────────────────
// 데이터 모델 (Supabase 테이블로 그대로 옮길 수 있도록 평평한 JSON 구조 유지)
// ───────────────────────────────────────────────

export type ReactionTrial = {
  color: "green" | "red";
  /** hit: 초록에 정상 반응, miss: 초록에 반응 못함, false: 빨강을 누름, early: 색 바뀌기 전에 누름, withheld: 빨강을 잘 참음 */
  outcome: "hit" | "miss" | "false" | "early" | "withheld";
  rtMs: number | null;
};

export type ReactionResult = {
  avgMs: number | null;
  bestMs: number | null;
  falseTaps: number;
  misses: number;
  hits: number;
  totalTrials: number;
  /** 올바르게 처리한 시행 비율(%) */
  accuracy: number;
  trials: ReactionTrial[];
};

export type ArrowResult = {
  correct: number;
  wrong: number;
  total: number;
  avgMs: number;
  accuracy: number;
};

export type TypingResult = {
  totalTimeMs: number;
  /** 오타율(%) = (최종 오타 + 입력 중 고친 오타) / 목표 글자 수 */
  errorRate: number;
  corrections: number;
  backspaces: number;
  /** 분당 타수(자모 기준) */
  cpm: number;
  sentences: number;
};

export type GameResults = {
  reaction: ReactionResult;
  arrow: ArrowResult;
  typing: TypingResult;
};

export type DrinkType = "soju" | "beer" | "wine" | "makgeolli" | "whisky" | "etc";
export type Feeling = "fine" | "tipsy" | "drunk";

export type DrinkInfo = {
  drank: boolean;
  type: DrinkType | null;
  volumeMl: number | null;
  abv: number | null;
  /** 음주 시작 시각 (HH:mm) */
  startTime: string | null;
  /** 마지막으로 마신 시각 (HH:mm) */
  lastTime: string | null;
  feeling: Feeling;
};

export type NextDayLog = {
  hangover: number; // 0~5
  blackout: boolean;
  fatigue: number; // 0~5
  memo: string;
  recordedAt: string;
};

/** 게임 규칙 버전. 시행 횟수·문장 수가 다르면 비교가 왜곡되므로 같은 버전끼리만 기준으로 사용 */
export const CURRENT_PROTOCOL = 2; // v2: 30초 버전 (반응 5회, 화살표 5문제, 짧은 문장 1개)

export type SessionRecord = {
  id: string;
  /** 없으면 v1 (2분 버전) */
  protocol?: number;
  kind: "baseline" | "test";
  createdAt: string; // ISO
  results: GameResults;
  drink?: DrinkInfo;
  /** 테스트 당시의 맨정신 기준값 (이후 기준이 바뀌어도 당시 비교가 유지되도록 스냅샷) */
  baselineSnapshot?: GameResults;
  baselineCount?: number;
  nextDay?: NextDayLog;
};
